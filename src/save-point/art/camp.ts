import type { Palette } from "../sprite.ts";
import { grid, rowsOf, setCell } from "../pixels.ts";

export const INK = "#0f0d1c";

const botBase: Palette = { O: INK, S: "#4d4a78", B: "#8388bd", H: "#c9cdf5" };
export const glassDim: Palette = { ...botBase, G: "#37325c", g: "#2a264b", E: "#7a74b0" };
export const glassLit: Palette = { ...botBase, G: "#ffd36e", g: "#f79a4e", E: "#2a1a2e" };
export const glassHot: Palette = { ...botBase, G: "#fff1c1", g: "#ffd36e", E: "#2a1a2e" };

export const BOT_AWAKE = [
  "....OOO....",
  "...O...O...",
  "..OOOOOOO..",
  ".OHBBBBBSO.",
  ".OGGGGGGgO.",
  ".OGEGGGEgO.",
  ".OGEGGGEgO.",
  ".OGGGGGGgO.",
  ".OHBBBBBSO.",
  "..OSSSSSO..",
  "..OBO.OBO..",
  "..OOO.OOO..",
];
export const BOT_BLINK = [
  "....OOO....",
  "...O...O...",
  "..OOOOOOO..",
  ".OHBBBBBSO.",
  ".OGGGGGGgO.",
  ".OGGGGGGgO.",
  ".OGEGGGEgO.",
  ".OGGGGGGgO.",
  ".OHBBBBBSO.",
  "..OSSSSSO..",
  "..OBO.OBO..",
  "..OOO.OOO..",
];
export const BOT_SLEEP = [
  "...........",
  "....OOO....",
  "...O...O...",
  "..OOOOOOO..",
  ".OHBBBBBSO.",
  ".OGGGGGGgO.",
  ".OGGGGGGgO.",
  ".OGEEGEEgO.",
  ".OGGGGGGgO.",
  ".OHBBBBBSO.",
  "..OSSSSSO..",
  ".OOOOOOOOO.",
];
// One row lower than BOT_AWAKE: the squash on the hammer strike.
export const BOT_SQUASH = ["...........", ...BOT_AWAKE.slice(0, 9), "..OSSSSSO..", ".OOOO.OOOO."];

export const toolPalette: Palette = {
  A: "#b3b6dc",
  a: "#5d5f8c",
  d: "#3a3b61",
  M: "#9a9dc6",
  m: "#6b6e9c",
  h: "#9c6a48",
  B: "#8388bd",
  O: INK,
  s: "#ffe9a8",
  t: "#f79a4e",
};
const ANVIL = ["..AAAAAAAA.", "..daaaaaad.", "....aaaa...", "...aaaaaa..", "..dddddddd."];
export const TOOL_REST = [
  "...........",
  "...........",
  "...........",
  "...........",
  "...........",
  "...Mm......",
  "...MMhhhh..",
  ...ANVIL,
];
export const TOOL_UP = [
  ".....MMm...",
  ".....MMm...",
  "....hh.....",
  "...h.......",
  "..h........",
  ".B.........",
  "B..........",
  ...ANVIL,
];
export const TOOL_HIT = [
  "...........",
  ".........s.",
  "...........",
  ".s.....t...",
  "..........s",
  "BBh.MMm..t.",
  "...hMMm.s..",
  ...ANVIL,
];

export const firePalette: Palette = {
  R: "#e5604f",
  O: "#f79a4e",
  Y: "#ffd36e",
  W: "#fff4cf",
  L: "#7a4c38",
  l: "#4c2f2c",
  k: "#3b3757",
  r: "#b8463f",
  o: "#e07a3c",
  s: "#ffd36e",
};
export const FIRE_EMBER = [
  "...........",
  "...........",
  "...........",
  "...........",
  "...........",
  "...........",
  "...........",
  "...........",
  "...........",
  "...........",
  "...........",
  "....r..o...",
  ".lLLrLroLl.",
  "..kk.k.kk..",
];
export const FIRE_LOW_A = [
  "...........",
  "...........",
  "...........",
  "...........",
  "...........",
  "....R......",
  "....RR.....",
  "...ROR.....",
  "...ROOR....",
  "..RROYOR...",
  "..ROYYOR...",
  "..ROYWYOR..",
  ".lLRYWYRLl.",
  "..kk.k.kk..",
];
export const FIRE_LOW_B = [
  "...........",
  "...........",
  "...........",
  "...........",
  "...........",
  "......R....",
  ".....RR....",
  ".....ROR...",
  "....ROOR...",
  "...ROYORR..",
  "...ROYYOR..",
  "..ROYWYOR..",
  ".lLRYWYRLl.",
  "..kk.k.kk..",
];
export const FIRE_BLAZE_A = [
  "......s....",
  "..s........",
  "....R......",
  "....RR.....",
  "...ROR.....",
  "...ROOR....",
  "..RROYOR...",
  "..ROYYORR..",
  ".RROYYYOR..",
  ".ROYYWYOR..",
  ".ROYWWYYOR.",
  ".ROYWWWYOR.",
  ".lRYWWWYRl.",
  "..kk.k.kk..",
];
export const FIRE_BLAZE_B = [
  "...s.......",
  "........s..",
  "......R....",
  ".....RR....",
  ".....ROR...",
  "....ROOR...",
  "...ROYORR..",
  "..RROYYOR..",
  "..ROYYYORR.",
  "..ROYWYYOR.",
  ".ROYYWWYOR.",
  ".ROYWWWYOR.",
  ".lRYWWWYRl.",
  "..kk.k.kk..",
];
export const FIRE_BLAZE_C = [
  ".........s.",
  "....s......",
  ".....R.....",
  ".....R.....",
  "....ROR....",
  "...RROOR...",
  "...ROYOR...",
  "..ROYYYOR..",
  ".RROYWYORR.",
  ".ROYYWYYOR.",
  ".ROYWWWYOR.",
  ".ROYWWWYOR.",
  ".lRYWWWYRl.",
  "..kk.k.kk..",
];

export const balloonPalette: Palette = { O: INK, W: "#f4f0ff", D: "#2f2a5c", X: "#e5604f" };
const balloon = (glyph: string[]) => [
  "..OOOOOOO..",
  ".OWWWWWWWO.",
  ...glyph.map((row) => `OW${row.replaceAll(".", "W")}WO`),
  ".OWWWWWWWO.",
  "..OWWOOOO..",
  "..OWO......",
  "..OO.......",
];
export const BALLOON_DOTS_1 = balloon([".......", ".D.....", "......."]);
export const BALLOON_DOTS_2 = balloon([".......", ".D.D...", "......."]);
export const BALLOON_DOTS_3 = balloon([".......", ".D.D.D.", "......."]);
export const BALLOON_BANG = [
  "..OOOOOOO..",
  ".OWWWXWWWO.",
  "OWWWWXWWWWO",
  "OWWWWXWWWWO",
  "OWWWWWWWWWO",
  ".OWWWXWWWO.",
  "..OWWOOOO..",
  "..OWO......",
  "..OO.......",
];
export const ZZZ = [
  ".....ZZZZZ",
  "........Z.",
  ".......Z..",
  "......Z...",
  ".....ZZZZZ",
  "..........",
  "ZZZZ......",
  "..Z.......",
  ".Z........",
  "ZZZZ......",
];

export const CURSOR = ["G..", "GG.", "GGG", "GG.", "G.."];

// A tent: lit on the side that faces the fire.
const TENT_W = 21;
const TENT_H = 14;
const TENT_APEX = 10;

// Row y of the tent spans `half` cells either side of the apex.
function tentCell(x: number, y: number, half: number) {
  if (x === TENT_APEX - half || x === TENT_APEX + half || y === TENT_H - 1) {
    return "O";
  }
  if (y >= 5 && Math.abs(x - TENT_APEX) <= Math.floor((y - 5) * 0.34)) {
    return "D";
  }
  return x < TENT_APEX ? "t" : "T";
}

export function tentRows(): string[] {
  const cells = grid(TENT_W, TENT_H);
  for (let y = 0; y < TENT_H; y += 1) {
    const half = Math.ceil(y * 0.74);
    for (let x = TENT_APEX - half; x <= TENT_APEX + half; x += 1) {
      setCell(cells, x, y, tentCell(x, y, half));
    }
  }
  return rowsOf(cells);
}
