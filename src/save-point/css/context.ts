import type { Landscape } from "../landscape.ts";
import type { Sprite } from "../sprite.ts";
import type { SpriteName, Sprites } from "../sprites.ts";

/** CSS pixels per art pixel. */
const S = 3;

export const px = (art: number): string => `${art * S}px`;
export const size = (s: { w: number; h: number }): string => `${px(s.w)} ${px(s.h)}`;
export const kebab = (key: string): string =>
  key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
// The custom property that holds a sprite's image.
export const img = (key: SpriteName): string => `var(--sp-${kebab(key)})`;

// The stage stands on the composer card's top edge and spans its width. The camp is on the left;
// the rest of the edge is where the knight meets monsters. Camp positions are art px from the
// stage's left edge.
export const STAGE_H = 32;
const TENT_X = 3;
const BOT_X = 22;
const TOOL_X = 32;
const FIRE_X = 46;
const MAGE_X = 60;
export const KNIGHT_HOME = px(72);
// Where the fight happens and where monsters appear. Both scale with the card, and the spawn
// point stays left of the tabs that sit on the card's right shoulder.
export const MEET = "62%";
export const KNIGHT_FIGHT = "calc(62% - 36px)";
export const SPAWN = "calc(100% - 150px)";
const fireCenterX = (FIRE_X + 5.5) * S;
const fireCenterY = (STAGE_H - 6) * S;
const GLOW_W = 168;
const GLOW_H = 132;

export const CONV = '.dark [data-workspace-area="conversation"]';
const FORM = ".dark [data-chat-composer-form]";
// The composer card. The form's own box also holds the row of tabs above the card (Stash, queued
// messages), so the stage anchors here to stand on the card's edge.
export const CARD = "[data-chat-composer-main-surface]";
// A run in progress shows as a live row at the end of the timeline. Scrolled away from it, the
// composer's button still says so: Stop, or Queue/Steer once there is a draft.
const LIVE_ROW =
  ':is([data-timeline-row-kind="working"], [data-timeline-row-kind="work-live"], [data-timeline-row-kind="thinking"])';
const RUN_BUTTON =
  'button:is([aria-label="Stop generation"], [aria-label="Stopping"], [aria-label="Queue message"], [aria-label="Steer message"])';
export const CONV_WORKING = `${CONV}:has(${LIVE_ROW}, ~ * ${RUN_BUTTON})`;
export const STAGE = `${FORM} ${CARD}::before`;
export const STAGE_READY = `${FORM}:focus-within ${CARD}::before`;
export const STAGE_WORKING = `${CONV}:has(${LIVE_ROW}) ~ * ${CARD}::before,
${FORM}:has(${RUN_BUTTON}) ${CARD}::before`;
// A question or approval opens a drawer above the card; the stage moves on top of it.
export const WAITING = `${FORM}:has([data-chat-composer-top-drawer])`;

const onGround = (x: string) => `${x} 100%`;

/** The stage's background layers, each list comma-separated in front-to-back order. */
export interface StageLayers {
  readonly image: string;
  readonly position: string;
  readonly size: string;
}

/**
 * Lays out the stage's background layers from front to back.
 *
 * @param sprites - The build's sprite catalog.
 * @param note - The sprite over the bot's head: the "zzz", a balloon, or the "!".
 * @param lift - How many art pixels to raise the note.
 * @returns The values of `background-image`, `background-position`, and `background-size`.
 */
export function stage(sprites: Sprites, note: Sprite, lift = 0): StageLayers {
  const noteTop = STAGE_H - 13 - note.h - lift + (note === sprites.zzz ? 1 : 0);
  // The knight, the monster and the effect over it each have two frames, a and b, on two layers.
  // --sp-t is 0 or 1 and gives one of the pair its width and the other none.
  const frame = (sprite: Sprite, phase: "a" | "b") =>
    `calc(${px(sprite.w)} * ${phase === "a" ? "(1 - var(--sp-t))" : "var(--sp-t)"}) ${px(sprite.h)}`;
  const layers: Array<[image: string, position: string, size: string]> = [
    ["var(--sp-note)", `${px(BOT_X + 7)} ${px(noteTop)}`, size(note)],
    ["var(--sp-fa)", onGround("var(--sp-mx)"), frame(sprites.impact, "a")],
    ["var(--sp-fb)", onGround("var(--sp-mx)"), frame(sprites.impact, "b")],
    ["var(--sp-ma)", onGround("var(--sp-mx)"), frame(sprites.slimeA, "a")],
    ["var(--sp-mb)", onGround("var(--sp-mx)"), frame(sprites.slimeA, "b")],
    ["var(--sp-ka)", onGround("var(--sp-kx)"), frame(sprites.knightStand, "a")],
    ["var(--sp-kb)", onGround("var(--sp-kx)"), frame(sprites.knightStand, "b")],
    ["var(--sp-bot)", onGround(px(BOT_X)), size(sprites.botAwake)],
    ["var(--sp-tool)", onGround(px(TOOL_X)), size(sprites.toolRest)],
    ["var(--sp-mage)", onGround(px(MAGE_X)), size(sprites.mageIdle)],
    ["var(--sp-fire)", onGround(px(FIRE_X)), size(sprites.fireEmber)],
    [img("tent"), onGround(px(TENT_X)), size(sprites.tent)],
    [
      "radial-gradient(closest-side, var(--sp-glow), transparent)",
      `${fireCenterX - GLOW_W / 2}px ${fireCenterY - GLOW_H / 2}px`,
      `${GLOW_W}px ${GLOW_H}px`,
    ],
  ];
  const column = (index: 0 | 1 | 2) => layers.map((layer) => layer[index]).join(",\n    ");
  return { image: column(0), position: column(1), size: column(2) };
}

/** What every CSS fragment of one build reads. */
export interface CssContext {
  readonly sprites: Sprites;
  readonly landscape: Pick<Landscape, "width" | "height" | "background">;
  /** The stage at rest, with the "zzz". */
  readonly atRest: StageLayers;
  /** The stage with a balloon, while working or waiting. */
  readonly withBalloon: StageLayers;
}
