import type { Palette } from "../sprite.ts";
import { INK } from "./camp.ts";

// The knight is drawn centred on a canvas with room for the sword on either side, so a mirrored
// frame keeps the body in place.
export const knightPalette: Palette = {
  O: INK,
  P: "#e5604f",
  H: "#d6daf0",
  h: "#9094bc",
  d: "#55597f",
  f: "#f2c9a0",
  E: "#2a1a2e",
  A: "#5c86d6",
  a: "#3c5ca3",
  S: "#c9463f",
  W: "#f3f5ff",
  w: "#a9adcf",
  g: "#f0b765",
  B: "#7a4c38",
};
const KNIGHT_TOP = [
  "......PP........",
  ".....PPP........",
  "....OOOOOO......",
  "...OHHHHHhO.....",
  "...OHhhffEO.W...",
  "...OhhhffEO.W...",
  "...OhhhhhhO.W...",
  "....OOOOOO..W...",
  "...OAAAAAAOgWg..",
  "..OSSOAAAaOfg...",
  "..OSSOAAaaO.g...",
  "..OOOOaaaaO.....",
];
const LEGS_STAND = ["....OBO.OBO.....", "....OOO.OOO....."];
const LEGS_APART = ["...OBO...OBO....", "...OOO...OOO...."];
const LEGS_CLOSED = [".....OBBBO......", ".....OOOOO......"];
export const KNIGHT_STAND = [...KNIGHT_TOP, ...LEGS_STAND];
export const KNIGHT_WALK_A = [...KNIGHT_TOP, ...LEGS_APART];
export const KNIGHT_WALK_B = [...KNIGHT_TOP, ...LEGS_CLOSED];
export const KNIGHT_SLASH = [
  "......PP........",
  ".....PPP........",
  "....OOOOOO......",
  "...OHHHHHhO.....",
  "...OHhhffEO.....",
  "...OhhhffEO..w..",
  "...OhhhhhhO...w.",
  "....OOOOOO.....w",
  "...OAAAAAAOfgWWW",
  "..OSSOAAAaO.....",
  "..OSSOAAaaO.....",
  "..OOOOaaaaO.....",
  ...LEGS_APART,
];
export const KNIGHT_SLEEP = [
  "................",
  "................",
  ".....PP.........",
  "....OOOOOO......",
  "...OHHHHHhO.....",
  "...OHhhffdO.W...",
  "...OhhhffhO.W...",
  "...OhhhhhhO.W...",
  "....OOOOOO..W...",
  "...OAAAAAAOgWg..",
  "..OSSOAAAaO.g...",
  "..OSSOAAaaO.g...",
  "..OOOOaaaaO.g...",
  "..OBBOOOOBBO....",
];

const mageBase: Palette = {
  O: INK,
  V: "#9166da",
  v: "#6747a8",
  g: "#f0b765",
  f: "#f2c9a0",
  E: "#2a1a2e",
  N: "#f1edfb",
  t: "#9c6a48",
  s: "#fff1c1",
};
export const mageIdle: Palette = { ...mageBase, c: "#58c7c9", C: "#58c7c9" };
export const mageLit: Palette = { ...mageBase, c: "#aef4f0", C: "#effffd" };
export const mageAsleep: Palette = { ...mageBase, c: "#3d6f7c", C: "#3d6f7c", E: "#c08f6e" };
export const MAGE = [
  ".......V.....",
  "......VVv....",
  "......VVv....",
  ".....VVVVv...",
  ".....ggggg...",
  "...VVVVVVVVv.",
  ".c..OffffO...",
  "cCc.OEffEO...",
  ".c..ONNNNO...",
  ".t.VVNNNNVV..",
  ".tfVVVNNVVV..",
  ".t.VVVVVVVV..",
  ".t.VvVVVVvV..",
  ".t.VvVVVVvV..",
  ".t.OOOOOOOO..",
];

// MAGE with the rows at the given indexes replaced.
const castFrame = (changes: Readonly<Record<number, string>>) =>
  MAGE.map((row, y) => changes[y] ?? row);
export const MAGE_CAST_A = castFrame({ 4: "..s..ggggg...", 9: "st.VVNNNNVV.." });
export const MAGE_CAST_B = castFrame({
  4: "s....ggggg...",
  5: "..sVVVVVVVVv.",
  8: ".c.sONNNNO...",
});
