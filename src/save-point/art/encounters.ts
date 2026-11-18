import type { Palette } from "../sprite.ts";
import { blank } from "../pixels.ts";
import { INK } from "./camp.ts";

// Monsters and the effects that play over them share one canvas, so one layer can show any of them.
export const slimePalette: Palette = {
  O: INK,
  G: "#7fd98c",
  g: "#4fa868",
  L: "#d3f8d6",
  E: "#17301f",
};
export const SLIME_A = [
  ...blank(13, 7),
  "....OOOOO....",
  "..OOGGGGGOO..",
  ".OGLGGGGGGGO.",
  ".OGGEGGGEGGO.",
  "OGGGGGGGGGGGO",
  "OGGGGggggGGGO",
  ".OOOOOOOOOOO.",
];
export const SLIME_B = [
  ...blank(13, 4),
  ".....OOO.....",
  "...OOGGGOO...",
  "..OGLGGGGGO..",
  "..OGEGGGEGO..",
  "..OGGGGGGGO..",
  "..OGGGGGGGO..",
  "..OGGgggGGO..",
  "...OOOOOOO...",
  ...blank(13, 2),
];
export const batPalette: Palette = { O: INK, M: "#7a68b0", r: "#ff7a7a" };
export const BAT_A = [
  ...blank(13, 2),
  ".O.........O.",
  "OMO.O...O.OMO",
  "OMMOMO.OMOMMO",
  ".OMMMMOMMMMO.",
  "..OMMrMrMMO..",
  "...OMMMMMO...",
  "....OO.OO....",
  ...blank(13, 5),
];
export const BAT_B = [
  ...blank(13, 4),
  "....O...O....",
  "...OMO.OMO...",
  ".OOMMMOMMMOO.",
  "OMMMMrMrMMMMO",
  "OMOOMMMMMOOMO",
  "OO..OO.OO..OO",
  ...blank(13, 4),
];
export const ghostPalette: Palette = {
  O: INK,
  W: "#eef0ff",
  s: "#b9bde0",
  E: "#2a1a2e",
  o: "#6b6e9c",
};
export const GHOST_A = [
  ".............",
  "....OOOOO....",
  "...OWWWWWO...",
  "..OWWWWWWWO..",
  "..OWEWWWEWO..",
  "..OWEWWWEWO..",
  "..OWWWWWWWO..",
  "..OWWWoWWWO..",
  "..OWWWWWWWO..",
  "..OWWWWWWWO..",
  "..OWsWWWsWO..",
  "..OWOWWOWWO..",
  "...O.OO.OO...",
  ".............",
];
export const GHOST_B = [
  "....OOOOO....",
  "...OWWWWWO...",
  "..OWWWWWWWO..",
  "..OWEWWWEWO..",
  "..OWEWWWEWO..",
  "..OWWWWWWWO..",
  "..OWWWoWWWO..",
  "..OWWWWWWWO..",
  "..OWWWWWWWO..",
  "..OWsWWWsWO..",
  "..OWWOWWOWO..",
  "...OO.OO.O...",
  ...blank(13, 2),
];
export const fxPalette: Palette = {
  Y: "#ffd36e",
  W: "#ffffff",
  p: "#8f88c8",
  P: "#e9e4ff",
  g: "#c98a3c",
  s: "#fff1c1",
};
export const IMPACT = [
  ...blank(13, 5),
  "...Y.........",
  ".Y.Y.Y.......",
  "..YWY........",
  "YYWWWYY......",
  "..YWY........",
  ".Y.Y.Y.......",
  "...Y.........",
  ...blank(13, 2),
];
export const POOF_A = [
  ...blank(13, 6),
  "....ppp......",
  "..pppPppp....",
  ".ppPPPPPpp...",
  ".pPPPPPPPp...",
  "..pPPPPPp....",
  "...ppppp.....",
  ...blank(13, 2),
];
export const POOF_B = [
  ...blank(13, 4),
  "..pp....pp...",
  ".pPp....pPp..",
  "..p......p...",
  ".............",
  ".....pp......",
  "....pPPp.....",
  "..p..pp..p...",
  ".pPp....pPp..",
  "..p......p...",
  ".............",
];
export const COIN = [
  ...blank(13, 3),
  "......s......",
  ".....ggg.....",
  "....gYYYg....",
  "....gYsYg....",
  "....gYYYg....",
  ".....ggg.....",
  ...blank(13, 5),
];
