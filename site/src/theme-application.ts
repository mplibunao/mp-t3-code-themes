// Applies a loaded theme the way T3 Code applies one (apps/web/src/themePalette.ts, themeCss.ts,
// themeBackground.ts): each colour role as an --app-theme-* variable on <html>, the theme's CSS in
// one adopted stylesheet after the document's own, the background in --theme-background-image,
// data-theme-id, and the dark class. The page shows themes this repository built, each with a
// complete palette, so it has no palette derivation and no sanitizer.

import type { LoadedTheme } from "./load-theme.ts";

const BACKGROUND_VARIABLE = "--theme-background-image";

/** A theme whose stylesheet is parsed and whose variables are named, ready to commit at once. */
export interface PreparedTheme {
  readonly id: string;
  readonly dark: boolean;
  readonly variables: ReadonlyArray<readonly [name: string, value: string]>;
  readonly sheet: CSSStyleSheet;
  readonly background: string | null;
}

/** Commits a prepared theme, replacing the previous one. */
export type ThemeApplication = (theme: PreparedTheme) => void;

// T3 Code turns the camel-case role into kebab case, except for terminalSelection.
const variableName = (role: string): string =>
  role === "terminalSelection"
    ? "--app-theme-terminal-selection-background"
    : `--app-theme-${role.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)}`;

/**
 * Parses the theme's CSS into a new stylesheet and names its variables, without changing the page.
 *
 * @param theme - A loaded theme.
 * @returns The theme, ready to commit.
 */
export const prepareTheme = (theme: LoadedTheme): PreparedTheme => {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(theme.document.css);
  return {
    id: theme.id,
    dark: theme.document.appearance === "dark",
    variables: Object.entries(theme.document.colors).map(
      ([role, value]) => [variableName(role), value] as const,
    ),
    sheet,
    background: theme.background,
  };
};

// The theme reads the background variable inside a background-image list, so the value needs the
// url() wrapper.
const applyAttributes = (root: HTMLElement, theme: PreparedTheme): void => {
  const background = theme.background === null ? "" : `url("${theme.background}")`;
  root.style.setProperty(BACKGROUND_VARIABLE, background);
  root.classList.toggle("dark", theme.dark);
  root.dataset["themeId"] = theme.id;
};

/**
 * @param root - The document's root element, which holds the theme's variables and attributes.
 * @returns A function that commits a prepared theme in one synchronous step.
 */
export const createThemeApplication = (root: HTMLElement): ThemeApplication => {
  let sheet: CSSStyleSheet | null = null;
  let variables: readonly string[] = [];
  return (theme) => {
    for (const name of variables) {
      root.style.removeProperty(name);
    }
    for (const [name, value] of theme.variables) {
      root.style.setProperty(name, value);
    }
    variables = theme.variables.map(([name]) => name);
    const others = document.adoptedStyleSheets.filter((adopted) => adopted !== sheet);
    document.adoptedStyleSheets = [...others, theme.sheet];
    sheet = theme.sheet;
    applyAttributes(root, theme);
  };
};
