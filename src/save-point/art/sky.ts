import type { Palette } from "../sprite.ts";
import { blank, grid, mulberry32, rowsOf, setCell } from "../pixels.ts";

// A shooting star falling to the lower left; the head leads. Drawn on the dragon's canvas,
// because the two take turns in one element.
export const COMET = [
  "................ab....",
  "..............ab......",
  "............bc........",
  "..........bc..........",
  "........cc............",
  "......cd..............",
  "....dd................",
  "..dW..................",
  "WW....................",
  ...blank(22, 3),
];
export const cometPalette: Palette = {
  a: "#3d3770",
  b: "#5b5496",
  c: "#8f88c8",
  d: "#cfc8f2",
  W: "#ffffff",
};

export const dragonPalette: Palette = { d: "#55253f", D: "#8f3f5f", b: "#cf9070", e: "#ffd36e" };
export const DRAGON_UP = [
  "........dd............",
  ".......dDDd...........",
  "......dDDDd...........",
  ".....dDDDDd......dd...",
  "....dDDDDDd.....dDDd..",
  "dd..dDDDDDDd...dDDeDdd",
  ".dddDDDDDDDDdddDDDDDd.",
  "..dDDDDDDDDDDDDDDDdd..",
  "...dbbbbbbbbbbbDdd....",
  "....dddddddddddd......",
  "......d..d............",
  "......................",
];
export const DRAGON_DOWN = [
  "......................",
  "......................",
  ".................dd...",
  "................dDDd..",
  "dd.............dDDeDdd",
  ".dddddddddddddddDDDDd.",
  "..dDDDDDDDDDDDDDDDdd..",
  "...dbbbDDDDDbbbDdd....",
  "....dddDDDDDddd.......",
  "......dDDDDd..........",
  ".......dDDd...........",
  "........dd............",
];

// A bite out of the moon: a disc offset from its centre.
type Cut = { dx: number; dy: number; r: number } | null;

function moonCell(size: number, cut: Cut, x: number, y: number) {
  const c = (size - 1) / 2;
  const r = size / 2 - 0.2;
  if ((x - c) ** 2 + (y - c) ** 2 > r * r) {
    return ".";
  }
  if (cut && (x - c - cut.dx) ** 2 + (y - c - cut.dy) ** 2 <= cut.r * cut.r) {
    return ".";
  }
  // The limb away from the bite stays bright; the inner edge falls into shade.
  const nearCut = cut
    ? (x - c - cut.dx) ** 2 + (y - c - cut.dy) ** 2 <= (cut.r + 1.6) ** 2
    : x - c + (y - c) > size * 0.28;
  return nearCut ? "s" : "M";
}

export function moonRows(size: number, cut: Cut): string[] {
  const cells = grid(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      setCell(cells, x, y, moonCell(size, cut, x, y));
    }
  }
  return rowsOf(cells);
}

interface StarTile {
  readonly w: number;
  readonly h: number;
  readonly count: number;
  /** The share of stars drawn as a plus instead of a single pixel. */
  readonly plusShare: number;
  readonly seed: number;
}

type Put = (x: number, y: number, ch: string) => void;

const plusStar = (put: Put, x: number, y: number) => {
  put(x, y, "W");
  put(x - 1, y, "m");
  put(x + 1, y, "m");
  put(x, y - 1, "m");
  put(x, y + 1, "m");
};

const wrapIndex = (value: number, length: number) => ((value % length) + length) % length;

export function starTileRows(tile: StarTile): string[] {
  const rand = mulberry32(tile.seed);
  const cells = grid(tile.w, tile.h);
  // Stars that cross an edge wrap around, so the tile repeats without a seam.
  const put: Put = (x, y, ch) => setCell(cells, wrapIndex(x, tile.w), wrapIndex(y, tile.h), ch);
  for (let i = 0; i < tile.count; i += 1) {
    const x = Math.floor(rand() * tile.w);
    const y = Math.floor(rand() * tile.h);
    if (rand() < tile.plusShare) {
      plusStar(put, x, y);
    } else {
      put(x, y, rand() < 0.5 ? "W" : "m");
    }
  }
  return rowsOf(cells);
}
