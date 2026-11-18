// Loads a catalogued theme from the files the site build copied from themes/. URLs start at Vite's
// base, because GitHub Pages serves the site under /mp-t3-code-themes/, not at the domain root.

import { catalog, type ThemeId } from "../../src/catalog.ts";

const MS_PER_SECOND = 1000;
const LOAD_TIMEOUT_SECONDS = 10;
const LOAD_TIMEOUT_MS = LOAD_TIMEOUT_SECONDS * MS_PER_SECOND;

/** The parts of a theme file that the page reads. */
export interface ThemeDocument {
  readonly appearance: "light" | "dark";
  readonly colors: Readonly<Record<string, string>>;
  readonly css: string;
}

export interface LoadedTheme {
  readonly id: ThemeId;
  readonly document: ThemeDocument;
  /** The decoded background's address, or null for a theme without one. */
  readonly background: string | null;
}

/** A theme didn't load. The message says why, in a sentence for the page's status. */
export class ThemeLoadError extends Error {
  public override readonly name = "ThemeLoadError";
}

const themeUrl = (file: string): string => `${import.meta.env.BASE_URL}themes/${file}`;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readAppearance = (value: unknown): ThemeDocument["appearance"] | null =>
  value === "light" || value === "dark" ? value : null;

const readColors = (value: unknown): ThemeDocument["colors"] | null => {
  if (!isRecord(value)) {
    return null;
  }
  const entries = Object.entries(value);
  const strings = entries.filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  return strings.length === entries.length ? Object.fromEntries(strings) : null;
};

const readString = (value: unknown): string | null => (typeof value === "string" ? value : null);

// The page trusts files this repository built, which `pnpm themes:check` compares with the build.
// It checks only the fields it reads, so a broken file fails here and names the fields.
const readDocument = (file: string, value: unknown): ThemeDocument => {
  const fields = isRecord(value) ? value : {};
  const read = {
    appearance: readAppearance(fields["appearance"]),
    colors: readColors(fields["colors"]),
    // A theme may leave out its CSS.
    css: Object.hasOwn(fields, "css") ? readString(fields["css"]) : "",
  };
  const { appearance, colors, css } = read;
  if (appearance === null || colors === null || css === null) {
    const invalid = Object.entries(read).flatMap(([field, result]) =>
      result === null ? [field] : [],
    );
    throw new ThemeLoadError(`${file} has a missing or invalid ${invalid.join(", ")}.`);
  }
  return { appearance, colors, css };
};

const fetchDocument = async (id: ThemeId, signal: AbortSignal): Promise<ThemeDocument> => {
  const file = `themes/${id}.json`;
  const response = await fetch(themeUrl(`${id}.json`), { signal });
  if (!response.ok) {
    throw new ThemeLoadError(`${file} answered with HTTP ${response.status}.`);
  }
  const value: unknown = await response.json();
  return readDocument(file, value);
};

// Image.decode() takes no signal, so the load stops waiting for it when the signal aborts.
const whenAborted = (signal: AbortSignal): Promise<never> =>
  new Promise((_, reject) => {
    const stop = (): void => {
      reject(new DOMException("The load was aborted.", "AbortError"));
    };
    if (signal.aborted) {
      stop();
    }
    signal.addEventListener("abort", stop, { once: true });
  });

const decodeBackground = async (id: ThemeId, signal: AbortSignal): Promise<string | null> => {
  const { background }: { readonly background?: string } = catalog[id];
  if (typeof background !== "string") {
    return null;
  }
  const file = `themes/${id}.${background}`;
  const url = themeUrl(`${id}.${background}`);
  const image = new Image();
  image.src = url;
  const decoded = image.decode().catch(() => {
    throw new ThemeLoadError(`${file} didn't load as an image.`);
  });
  await Promise.race([decoded, whenAborted(signal)]);
  return url;
};

const describe = (id: ThemeId, error: unknown, timedOut: boolean): ThemeLoadError => {
  const { name } = catalog[id];
  if (timedOut) {
    return new ThemeLoadError(`${name} took longer than ${LOAD_TIMEOUT_SECONDS} seconds to load.`);
  }
  const reason = error instanceof Error ? error.message : String(error);
  return new ThemeLoadError(`${name} didn't load. ${reason}`);
};

/**
 * Fetches a theme's JSON, checks the fields the page reads, and decodes its background. Gives up
 * after 10 seconds.
 *
 * @param id - A catalogued theme.
 * @param signal - Aborts the load when a newer selection replaces it.
 * @returns The theme, ready to apply.
 */
export const loadTheme = async (id: ThemeId, signal: AbortSignal): Promise<LoadedTheme> => {
  const timeout = AbortSignal.timeout(LOAD_TIMEOUT_MS);
  const combined = AbortSignal.any([signal, timeout]);
  try {
    const document = await fetchDocument(id, combined);
    const background = await decodeBackground(id, combined);
    return { id, document, background };
  } catch (error) {
    // The caller ignores a load it replaced, so the reason doesn't matter there.
    throw signal.aborted ? error : describe(id, error, timeout.aborted);
  }
};
