// The site imports this file, so it imports nothing.

interface CatalogEntry {
  readonly name: string;
  readonly description: string;
  /** The image published beside `<id>.json`. Absent when the theme has none. */
  readonly background?: "png";
}

/** Every theme this repository builds, keyed by theme id. */
export const catalog = {
  "save-point": {
    name: "Save Point",
    description:
      "A pixel-art night scene. A camp on the composer's top edge reacts to the agent: resting, ready, working, and waiting.",
    background: "png",
  },
} as const satisfies Readonly<Record<string, CatalogEntry>>;

export type ThemeId = keyof typeof catalog;

export const isThemeId = (value: string): value is ThemeId => Object.hasOwn(catalog, value);
