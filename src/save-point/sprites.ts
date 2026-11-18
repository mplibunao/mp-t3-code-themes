import {
  BALLOON_BANG,
  BALLOON_DOTS_1,
  BALLOON_DOTS_2,
  BALLOON_DOTS_3,
  BOT_AWAKE,
  BOT_BLINK,
  BOT_SLEEP,
  BOT_SQUASH,
  CURSOR,
  FIRE_BLAZE_A,
  FIRE_BLAZE_B,
  FIRE_BLAZE_C,
  FIRE_EMBER,
  FIRE_LOW_A,
  FIRE_LOW_B,
  INK,
  TOOL_HIT,
  TOOL_REST,
  TOOL_UP,
  ZZZ,
  balloonPalette,
  firePalette,
  glassDim,
  glassHot,
  glassLit,
  tentRows,
  toolPalette,
} from "./art/camp.ts";
import {
  BAT_A,
  BAT_B,
  COIN,
  GHOST_A,
  GHOST_B,
  IMPACT,
  POOF_A,
  POOF_B,
  SLIME_A,
  SLIME_B,
  batPalette,
  fxPalette,
  ghostPalette,
  slimePalette,
} from "./art/encounters.ts";
import {
  KNIGHT_SLASH,
  KNIGHT_SLEEP,
  KNIGHT_STAND,
  KNIGHT_WALK_A,
  KNIGHT_WALK_B,
  MAGE,
  MAGE_CAST_A,
  MAGE_CAST_B,
  knightPalette,
  mageAsleep,
  mageIdle,
  mageLit,
} from "./art/party.ts";
import {
  COMET,
  DRAGON_DOWN,
  DRAGON_UP,
  cometPalette,
  dragonPalette,
  moonRows,
  starTileRows,
} from "./art/sky.ts";
import { mirror } from "./pixels.ts";
import { sprite } from "./sprite.ts";

const catalog = () => ({
  botSleep: sprite(BOT_SLEEP, glassDim),
  botAwake: sprite(BOT_AWAKE, glassLit),
  botBlink: sprite(BOT_BLINK, glassLit),
  botWorkA: sprite(BOT_AWAKE, glassHot),
  botWorkB: sprite(BOT_SQUASH, glassHot),
  toolRest: sprite(TOOL_REST, toolPalette),
  toolUp: sprite(TOOL_UP, toolPalette),
  toolHit: sprite(TOOL_HIT, toolPalette),
  fireEmber: sprite(FIRE_EMBER, firePalette),
  fireLowA: sprite(FIRE_LOW_A, firePalette),
  fireLowB: sprite(FIRE_LOW_B, firePalette),
  fireBlazeA: sprite(FIRE_BLAZE_A, firePalette),
  fireBlazeB: sprite(FIRE_BLAZE_B, firePalette),
  fireBlazeC: sprite(FIRE_BLAZE_C, firePalette),
  dots1: sprite(BALLOON_DOTS_1, balloonPalette),
  dots2: sprite(BALLOON_DOTS_2, balloonPalette),
  dots3: sprite(BALLOON_DOTS_3, balloonPalette),
  bang: sprite(BALLOON_BANG, balloonPalette),
  zzz: sprite(ZZZ, { Z: "#8f88c8" }),
  cursor: sprite(CURSOR, { G: "#f0b765" }),
  comet: sprite(COMET, cometPalette),
  dragonUp: sprite(DRAGON_UP, dragonPalette),
  dragonDown: sprite(DRAGON_DOWN, dragonPalette),
  knightStand: sprite(KNIGHT_STAND, knightPalette),
  knightWalkA: sprite(KNIGHT_WALK_A, knightPalette),
  knightWalkB: sprite(KNIGHT_WALK_B, knightPalette),
  knightBackA: sprite(mirror(KNIGHT_WALK_A), knightPalette),
  knightBackB: sprite(mirror(KNIGHT_WALK_B), knightPalette),
  knightSlash: sprite(KNIGHT_SLASH, knightPalette),
  knightSleep: sprite(KNIGHT_SLEEP, knightPalette),
  mageSleep: sprite(MAGE, mageAsleep),
  mageIdle: sprite(MAGE, mageIdle),
  mageCastA: sprite(MAGE_CAST_A, mageLit),
  mageCastB: sprite(MAGE_CAST_B, mageLit),
  slimeA: sprite(SLIME_A, slimePalette),
  slimeB: sprite(SLIME_B, slimePalette),
  batA: sprite(BAT_A, batPalette),
  batB: sprite(BAT_B, batPalette),
  ghostA: sprite(GHOST_A, ghostPalette),
  ghostB: sprite(GHOST_B, ghostPalette),
  impact: sprite(IMPACT, fxPalette),
  poofA: sprite(POOF_A, fxPalette),
  poofB: sprite(POOF_B, fxPalette),
  coin: sprite(COIN, fxPalette),
  tent: sprite(tentRows(), { O: INK, T: "#b9744a", t: "#7d4a3b", D: "#2b1c2c" }),
  // In a wide thread the text crosses the moons. They are brighter than the landscape's ceiling,
  // and dim enough that message text keeps 4.5:1 over them.
  moon: sprite(moonRows(22, { dx: 5.5, dy: -3.5, r: 9.6 }), { M: "#615a9c", s: "#4a447f" }),
  moonSmall: sprite(moonRows(7, null), { M: "#865274", s: "#6a4161" }),
  // Two tiles whose sizes share no factor, so the pair does not visibly repeat.
  // They sit behind message text, so they stay sparse, dim, and mostly single pixels.
  starsA: sprite(starTileRows({ w: 131, h: 97, count: 4, plusShare: 0.25, seed: 7 }), {
    W: "#6f69a8",
    m: "#48437d",
  }),
  starsB: sprite(starTileRows({ w: 173, h: 149, count: 6, plusShare: 0.2, seed: 19 }), {
    W: "#6f69a8",
    m: "#48437d",
  }),
});

export type Sprites = ReturnType<typeof catalog>;
export type SpriteName = keyof Sprites;

/**
 * Builds every sprite the CSS uses. The order of the keys is the order of the sprite variables in
 * the CSS, and the stage tells the "zzz" note apart from the others by identity, so each build
 * makes one catalog and passes it to every CSS fragment.
 *
 * @returns The sprites, keyed by name.
 */
export const buildSprites = (): Sprites => catalog();
