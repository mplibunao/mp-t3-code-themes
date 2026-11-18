import type { SpriteName } from "../sprites.ts";
import { img } from "./context.ts";

// One encounter lasts 20s: the knight walks out, fights, the monster bursts into a coin, and the
// knight walks home. The script sets each actor's pair of frames, one encounter per monster, and
// sp-tick flips --sp-t to alternate them. Keyframes name sprites only: a keyframe that reads
// another animated property goes stale in T3 Code while the animation runs.
export const ENCOUNTER_SECONDS = 20;
export const MONSTERS: Array<[SpriteName, SpriteName]> = [
  ["slimeA", "slimeB"],
  ["batA", "batB"],
  ["ghostA", "ghostB"],
];
const knightFrames = (a: SpriteName, b: SpriteName) => `--sp-ka: ${img(a)}; --sp-kb: ${img(b)};`;
const effect = (a: string, b: string) => `--sp-fa: ${a}; --sp-fb: ${b};`;
const encounter = (a: SpriteName, b: SpriteName): Array<[percent: number, frames: string]> => [
  [
    0,
    `${knightFrames("knightStand", "knightStand")} --sp-ma: none; --sp-mb: none; ${effect("none", "none")}`,
  ],
  [4, knightFrames("knightWalkA", "knightWalkB")],
  [8, `--sp-ma: ${img(a)}; --sp-mb: ${img(b)};`],
  [30, `${knightFrames("knightStand", "knightSlash")} --sp-fb: ${img("impact")};`],
  [
    52,
    `${knightFrames("knightStand", "knightStand")} --sp-ma: none; --sp-mb: none; ${effect(img("poofA"), img("poofA"))}`,
  ],
  [54, effect(img("poofB"), img("poofB"))],
  [56, effect(img("coin"), img("coin"))],
  [62, `${knightFrames("knightBackA", "knightBackB")} ${effect("none", "none")}`],
  [92, knightFrames("knightStand", "knightStand")],
];
export const encounterScript = (): string =>
  MONSTERS.flatMap(([a, b], index) =>
    encounter(a, b).map(
      ([percent, frames]) =>
        `  ${Number(((index * 100 + percent) / MONSTERS.length).toFixed(2))}% { ${frames} }`,
    ),
  ).join("\n");
