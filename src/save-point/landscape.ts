import { at, mulberry32 } from "./pixels.ts";
import { encodePng, type Raster } from "./png.ts";
import { createTone } from "./tone.ts";

/** The landscape PNG and what the CSS needs to place it. */
export interface Landscape {
  readonly png: Uint8Array;
  /** Width and height in art pixels. */
  readonly width: number;
  readonly height: number;
  /** The conversation background: the toned top colour of the sky. */
  readonly background: string;
}

const W = 640;
const H = 400;

interface Canvas extends Raster {
  readonly palette: string[];
  /** Draws a pixel at full brightness, past the tone curve. */
  readonly lamp: (x: number, y: number, hex: string) => void;
  /** Draws a pixel through the tone curve. */
  readonly put: (x: number, y: number, hex: string) => void;
}

const wrap = (x: number) => ((x % W) + W) % W;

// One canvas per build. Colours enter the palette in the order they're first drawn.
function createCanvas(tone: (hex: string) => string): Canvas {
  const palette: string[] = [];
  const pixels = new Uint8Array(W * H);
  const colorIndex = (hex: string) => {
    const found = palette.indexOf(hex);
    if (found >= 0) {
      return found;
    }
    palette.push(hex);
    return palette.length - 1;
  };
  // The lit windows and the eyes skip the tone curve, a few pixels each.
  const lamp = (x: number, y: number, hex: string) => {
    if (y < 0 || y >= H) {
      return;
    }
    pixels[y * W + wrap(Math.round(x))] = colorIndex(hex);
  };
  const put = (x: number, y: number, hex: string) => lamp(x, y, tone(hex));
  return { width: W, height: H, palette, pixels, lamp, put };
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
// oxlint-disable-next-line no-bitwise -- `& 3` picks the 4×4 dither cell. Rewriting the index would risk the byte-identical PNG.
const bayer = (x: number, y: number) => (at(at(BAYER, y & 3), x & 3) + 0.5) / 16;

const SKY = [
  "#0f0e1e",
  "#121126",
  "#17142f",
  "#1c1839",
  "#231c45",
  "#2c2151",
  "#37275c",
  "#442d66",
  "#53346e",
  "#633c75",
];
const HORIZON = H - 100;

function drawSky(canvas: Canvas) {
  for (let y = 0; y < H; y += 1) {
    const t = Math.min(1, y / HORIZON);
    const level = Math.pow(t, 2.4) * (SKY.length - 1);
    const base = Math.floor(level);
    const edge = Math.min(1, Math.max(0, (level - base - 0.5) * 2.6 + 0.5));
    for (let x = 0; x < W; x += 1) {
      const step = edge > bayer(x, y) ? 1 : 0;
      canvas.put(x, y, at(SKY, Math.min(SKY.length - 1, base + step)));
    }
  }
}

const brightStar = (canvas: Canvas, x: number, y: number) => {
  canvas.put(x, y, "#f1edff");
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    canvas.put(x + dx, y + dy, "#7d76b8");
  }
};

const starColor = (roll: number) => {
  if (roll < 0.35) {
    return "#d9d4f5";
  }
  return roll < 0.7 ? "#8f88c8" : "#565091";
};

function drawStars(canvas: Canvas) {
  const rand = mulberry32(21);
  for (let i = 0; i < 230; i += 1) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(Math.pow(rand(), 1.3) * (HORIZON - 70));
    const roll = rand();
    if (roll < 0.07) {
      brightStar(canvas, x, y);
    } else {
      canvas.put(x, y, starColor(roll));
    }
  }
}

interface Peak {
  readonly x: number;
  readonly h: number;
}

function peaks(count: number, minH: number, maxH: number, seed: number): Peak[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => ({
    x: Math.round(((i + 0.15 + rand() * 0.7) / count) * W),
    h: Math.round(minH + rand() * (maxH - minH)),
  }));
}

/** A range of triangular peaks: lit on the left face, shaded on the right, tiled across W. */
interface Range {
  readonly list: Peak[];
  readonly baseY: number;
  readonly slope: number;
  readonly lit: string;
  readonly shade: string;
  readonly snow?: { lit: string; shade: string; depth: number; above: number };
}

// Row `depth` below the peak's top.
function drawPeakRow(canvas: Canvas, range: Range, peak: Peak, depth: number) {
  const y = range.baseY - peak.h + depth;
  const snow = range.snow && peak.h >= range.snow.above ? range.snow : null;
  const half = Math.floor(depth * range.slope);
  // The shadow line leans right as it descends and zigzags, like a ridge.
  const ridge = depth * 0.3 + (Math.floor(depth / 3) % 2 === 0 ? 0 : 1);
  for (let dx = -half; dx <= half; dx += 1) {
    // The snow line zigzags: a sawtooth six pixels wide.
    const capped = snow !== null && depth < snow.depth + 3 - Math.abs(((dx + 600) % 6) - 3);
    const colors = capped ? snow : range;
    canvas.put(peak.x + dx, y, dx < ridge ? colors.lit : colors.shade);
  }
}

function drawRange(canvas: Canvas, range: Range) {
  for (let y = range.baseY; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      canvas.put(x, y, range.shade);
    }
  }
  // Tallest first, so shorter peaks stand in front and every edge between them is a slope.
  const tallestFirst = [...range.list];
  tallestFirst.sort((a, b) => b.h - a.h);
  for (const peak of tallestFirst) {
    const top = range.baseY - peak.h;
    for (let y = top; y < H; y += 1) {
      drawPeakRow(canvas, range, peak, y - top);
    }
  }
}

function drawMountains(canvas: Canvas) {
  drawRange(canvas, {
    list: peaks(7, 26, 62, 3),
    baseY: H - 94,
    slope: 1.9,
    lit: "#3b2f68",
    shade: "#30275a",
    snow: { lit: "#6e63a8", shade: "#4d4384", depth: 5, above: 40 },
  });
  drawRange(canvas, {
    list: peaks(9, 20, 50, 11),
    baseY: H - 68,
    slope: 1.35,
    lit: "#2a2350",
    shade: "#221c43",
  });
}

// Rolling near hills with pines, then the dark foreground.
const NEAR = "#16132b";
const GROUND = "#0f0d1f";
const hillTop = (x: number) => {
  const u = (x / W) * Math.PI * 2;
  return Math.round(
    H - 58 - 13 * Math.sin(u * 2 + 0.6) - 7 * Math.sin(u * 5 + 2.1) - 3 * Math.sin(u * 11 + 4),
  );
};

function drawHills(canvas: Canvas) {
  for (let x = 0; x < W; x += 1) {
    for (let y = hillTop(x); y < H; y += 1) {
      const fade = (y - (H - 46)) / 30;
      canvas.put(x, y, fade > bayer(x, y) ? GROUND : NEAR);
    }
  }
}

function pine(canvas: Canvas, x: number, size: number) {
  const base = hillTop(x) + 1;
  const height = size * 3 + 3;
  for (let i = 0; i < height; i += 1) {
    const tier = Math.floor(i / 3);
    const half = i < 2 ? 0 : Math.min(size, tier + (i % 3 === 2 ? 1 : 0));
    for (let dx = -half; dx <= half; dx += 1) {
      canvas.put(x + dx, base - height - 2 + i, NEAR);
    }
  }
  canvas.put(x, base - 2, NEAR);
  canvas.put(x, base - 1, NEAR);
}

function drawPines(canvas: Canvas) {
  const rand = mulberry32(5);
  for (let i = 0; i < 46; i += 1) {
    const x = Math.floor(rand() * W);
    pine(canvas, x, 2 + Math.floor(rand() * 4));
    if (rand() < 0.6) {
      pine(canvas, x + 5 + Math.floor(rand() * 4), 2 + Math.floor(rand() * 3));
    }
  }
}

// A watchtower with one lit window.
const TOWER_X = 452;

function drawTowerWalls(canvas: Canvas, base: number) {
  const x0 = TOWER_X;
  for (let y = base - 30; y < base; y += 1) {
    for (let x = x0; x < x0 + 9; x += 1) {
      canvas.put(x, y, NEAR);
    }
  }
  for (let x = x0 - 1; x < x0 + 10; x += 1) {
    for (let y = base - 34; y < base - 30; y += 1) {
      if (y >= base - 32 || (x - x0 + 1) % 4 < 2) {
        canvas.put(x, y, NEAR);
      }
    }
  }
}

function drawTowerWindow(canvas: Canvas, base: number) {
  const x0 = TOWER_X;
  for (let y = base - 24; y < base - 20; y += 1) {
    for (let x = x0 + 3; x < x0 + 6; x += 1) {
      canvas.lamp(x, y, "#ffd36e");
    }
  }
  canvas.lamp(x0 + 4, base - 25, "#ffd36e");
  canvas.lamp(x0 + 4, base - 22, "#f79a4e");
}

function drawTower(canvas: Canvas) {
  const base = hillTop(TOWER_X + 4) + 2;
  drawTowerWalls(canvas, base);
  drawTowerWindow(canvas, base);
}

// A hamlet across the valley from the tower, and two pairs of eyes in the dark of the hillside.
function house(canvas: Canvas, x0: number, w: number, h: number) {
  const base = hillTop(x0 + Math.floor(w / 2)) + 2;
  for (let y = base - h; y < base; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      canvas.put(x, y, NEAR);
    }
  }
  for (let i = 0; i <= Math.ceil(w / 2); i += 1) {
    for (let x = x0 - 1 + i; x <= x0 + w - i; x += 1) {
      canvas.put(x, base - h - 1 - i, NEAR);
    }
  }
  for (let y = base - h + 2; y < base - h + 4; y += 1) {
    for (let x = x0 + 2; x < x0 + 4; x += 1) {
      canvas.lamp(x, y, "#ffd36e");
    }
  }
}

function drawHamlet(canvas: Canvas) {
  house(canvas, 112, 9, 7);
  house(canvas, 126, 7, 5);
  for (const x of [318, 566]) {
    canvas.lamp(x, hillTop(x) + 5, "#ff7a7a");
    canvas.lamp(x + 2, hillTop(x) + 5, "#ff7a7a");
  }
}

/**
 * Draws the night landscape behind the conversation. Each call draws on a fresh canvas with its own
 * tone cache and random sequences.
 *
 * @returns The PNG, its size in art pixels, and the conversation background colour.
 */
export function buildLandscape(): Landscape {
  const tone = createTone();
  const canvas = createCanvas(tone);
  drawSky(canvas);
  drawStars(canvas);
  drawMountains(canvas);
  drawHills(canvas);
  drawPines(canvas);
  drawTower(canvas);
  drawHamlet(canvas);
  return { png: encodePng(canvas), width: W, height: H, background: tone(at(SKY, 0)) };
}
