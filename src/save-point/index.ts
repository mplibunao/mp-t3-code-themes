import type { BuiltTheme } from "../theme-contract.ts";
import { colors } from "./colors.ts";
import { buildCss } from "./css/index.ts";
import { buildLandscape } from "./landscape.ts";
import { buildSprites } from "./sprites.ts";

/**
 * Builds Save Point in memory. Each call draws its own landscape and sprite catalog and keeps
 * nothing afterwards. Throws when the artwork is invalid, such as a sprite row of the wrong width.
 *
 * @returns The theme document and the landscape PNG.
 */
export function buildSavePoint(): BuiltTheme {
  const sprites = buildSprites();
  const landscape = buildLandscape();
  return {
    id: "save-point",
    document: {
      name: "Save Point",
      appearance: "dark",
      canvas: colors.canvas,
      accent: colors.accent,
      colors: { ...colors },
      css: buildCss(sprites, landscape),
    },
    background: landscape.png,
  };
}
