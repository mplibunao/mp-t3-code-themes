import { at } from "./pixels.ts";

/** Maps each character of a pixel map to a colour. A "." is transparent. */
export type Palette = Record<string, string>;

/** A sprite as the CSS uses it: an SVG data URI and its size in art pixels. */
export interface Sprite {
  readonly uri: string;
  readonly w: number;
  readonly h: number;
}

const runLength = (row: string, x: number) => {
  let run = 1;
  while (x + run < row.length && row[x + run] === row[x]) {
    run += 1;
  }
  return run;
};

const colorOf = (palette: Palette, ch: string, y: number, row: string) => {
  const color = palette[ch];
  if (!color) {
    throw new Error(`no color for "${ch}" in row ${y}: ${row}`);
  }
  return color;
};

// One stroked line per run of pixels: shorter than a rect. The viewBox starts half a pixel up,
// so a line at y covers row y.
function addRuns(paths: Map<string, string>, row: string, y: number, palette: Palette) {
  let x = 0;
  while (x < row.length) {
    const ch = row.charAt(x);
    const run = runLength(row, x);
    if (ch !== ".") {
      const color = colorOf(palette, ch, y, row);
      paths.set(color, `${paths.get(color) ?? ""}M${x} ${y}h${run}`);
    }
    x += run;
  }
}

function spriteSvg(rows: readonly string[], palette: Palette) {
  const w = at(rows, 0).length;
  const h = rows.length;
  const paths = new Map<string, string>();
  rows.forEach((row, y) => {
    if (row.length !== w) {
      throw new Error(`row ${y} is ${row.length} wide, expected ${w}: ${row}`);
    }
    addRuns(paths, row, y, palette);
  });
  const body = [...paths].map(([color, d]) => `<path stroke='${color}' d='${d}'/>`).join("");
  return {
    svg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 -.5 ${w} ${h}' shape-rendering='crispEdges'>${body}</svg>`,
    w,
    h,
  };
}

// Theme CSS drops any value holding a backslash or a double quote inside url("..."), so the
// markup uses single quotes only and escapes just what a data: address needs.
const dataUri = (svg: string) =>
  `url("data:image/svg+xml,${svg.replace(/%/g, "%25").replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E")}")`;

export const sprite = (rows: readonly string[], palette: Palette): Sprite => {
  const { svg, w, h } = spriteSvg(rows, palette);
  return { uri: dataUri(svg), w, h };
};
