// The contract of the theme files this repository generates. It's narrower than T3 Code's own
// theme schema on purpose: a generated theme supplies the whole palette, so T3 Code never
// derives or fills in a colour.

import { Schema } from "effect";
import { catalog, isThemeId } from "./catalog.ts";

/**
 * The longest theme CSS that T3 Code 0.1.10 accepts, counted as JavaScript string length.
 * Raise it, together with the README's compatibility section, only when the oldest T3 Code
 * release this repository supports allows more.
 */
export const CSS_MAX_LENGTH = 50_000;

const NAME_MAX_LENGTH = 48;

/** Ids that T3 Code 0.1.10 never publishes: appearance keywords, built-in themes, their old ids, and the mobile default. */
const RESERVED_IDS: ReadonlySet<string> = new Set([
  "system",
  "light",
  "dark",
  "t3-chat",
  "grove",
  "ocean",
  "ember",
  "iris",
  "t3-chat-dark",
  "t3-grove",
  "t3-ocean",
  "t3-ember",
  "t3-iris",
  "t3-code",
]);

/** T3 Code 0.1.10's colour roles, in its order. */
export const COLOR_ROLES = [
  "canvas",
  "chrome",
  "toolbar",
  "toolbarForeground",
  "toolbarBorder",
  "toolbarControl",
  "toolbarControlForeground",
  "toolbarControlHover",
  "surface",
  "surfaceRaised",
  "surfaceOverlay",
  "text",
  "textMuted",
  "border",
  "input",
  "focus",
  "accent",
  "accentForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "placeholder",
  "secondaryLabel",
  "iconMuted",
  "error",
  "errorForeground",
  "errorSurface",
  "warning",
  "warningForeground",
  "warningSurface",
  "update",
  "updateForeground",
  "updateSurface",
  "accentSurface",
  "accentSurfaceForeground",
  "messageSurface",
  "messageForeground",
  "messageAction",
  "messageActionForeground",
  "messageActionHover",
  "codeBackground",
  "codeForeground",
  "searchMatchBackground",
  "searchMatchForeground",
  "searchMatchActiveBackground",
  "searchMatchActiveForeground",
  "sidebar",
  "sidebarForeground",
  "sidebarMutedForeground",
  "sidebarControlSurface",
  "sidebarRowHover",
  "sidebarRowActive",
  "sidebarRowSelected",
  "sidebarBorder",
  "terminalBackground",
  "terminalForeground",
  "terminalCursor",
  "terminalSelection",
  "terminalScrollbar",
  "terminalScrollbarHover",
] as const;

const HexColor = Schema.String.check(
  Schema.isPattern(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: "Expected a hexadecimal colour such as #17152b",
  }),
);

const Css = Schema.String.check(
  Schema.isMaxLength(CSS_MAX_LENGTH),
  // T3 Code's CSS sanitizer drops every declaration whose value holds a backslash.
  Schema.makeFilter((css) => !css.includes("\\") || "Expected CSS without a backslash"),
);

// Decoding returns the fields in this order, which is the key order of the published JSON.
const ThemeDocument = Schema.Struct({
  name: Schema.Trimmed.check(Schema.isNonEmpty(), Schema.isMaxLength(NAME_MAX_LENGTH)),
  appearance: Schema.Literals(["light", "dark"]),
  canvas: HexColor,
  accent: HexColor,
  colors: Schema.Record(Schema.Literals(COLOR_ROLES), HexColor),
  css: Schema.optionalKey(Css),
});

export type ThemeDocument = typeof ThemeDocument.Type;

const BuiltThemeId = Schema.String.check(
  Schema.isPattern(/^[a-z0-9][a-z0-9-]{0,47}$/, {
    message:
      "Expected 1 to 48 lowercase letters, digits, and hyphens, starting with a letter or digit",
  }),
  Schema.makeFilter(
    (id) => !RESERVED_IDS.has(id) || `Expected an id that T3 Code doesn't reserve, got "${id}"`,
  ),
).pipe(Schema.refine(isThemeId, { message: "Expected an id from src/catalog.ts" }));

const BuiltThemeSchema = Schema.Struct({
  id: BuiltThemeId,
  document: ThemeDocument,
  background: Schema.optionalKey(Schema.Uint8Array),
}).check(
  Schema.makeFilter((theme) => {
    const listed = "background" in catalog[theme.id];
    const built = "background" in theme;
    return (
      listed === built || {
        path: ["background"],
        issue: listed
          ? `Expected a background, because src/catalog.ts lists one for ${theme.id}`
          : `Expected no background, because src/catalog.ts lists none for ${theme.id}`,
      }
    );
  }),
);

/** A builder's result, held in memory. The caller owns the background bytes. */
export type BuiltTheme = typeof BuiltThemeSchema.Type;

/**
 * Checks a builder's result against the contract. The error lists every offending path, such as
 * `["document"]["colors"]["terminalSelection"]`. Unknown fields fail, which keeps unknown roles
 * and the `id`, `version`, and `variants` fields out of published files.
 */
export const validateBuiltTheme = Schema.decodeUnknownEffect(BuiltThemeSchema, {
  errors: "all",
  onExcessProperty: "error",
});
