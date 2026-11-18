import type { Sprites } from "../sprites.ts";
import { backdrop } from "./backdrop.ts";
import { chrome } from "./chrome.ts";
import { stage, type CssContext } from "./context.ts";
import { properties } from "./properties.ts";
import { sky } from "./sky.ts";
import { readyStage, restingStage } from "./stage.ts";
import { waiting } from "./waiting.ts";
import { movement, workingKeyframes, workingStage } from "./working.ts";

// In stylesheet order. Each fragment ends with its own line breaks.
const fragments: ReadonlyArray<(context: CssContext) => string> = [
  properties,
  backdrop,
  sky,
  restingStage,
  readyStage,
  workingStage,
  workingKeyframes,
  movement,
  waiting,
  chrome,
];

/**
 * Builds the theme CSS.
 *
 * @param sprites - The build's sprite catalog.
 * @param landscape - The landscape's size in art pixels and the conversation background colour.
 * @returns The stylesheet.
 */
export const buildCss = (sprites: Sprites, landscape: CssContext["landscape"]): string => {
  const context: CssContext = {
    sprites,
    landscape,
    atRest: stage(sprites, sprites.zzz),
    withBalloon: stage(sprites, sprites.dots1),
  };
  return fragments.map((fragment) => fragment(context)).join("");
};
