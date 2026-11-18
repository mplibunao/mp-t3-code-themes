// The query parameters: theme, state, width, and capture=1. An unknown value is an error rather
// than a default, so a capture never records a different picture from the one it asked for.

import { themeIds, type ThemeId } from "../../src/catalog.ts";
import { DEMO_STATES, type DemoState } from "./state.ts";

export const CHAT_WIDTHS = ["comfortable", "wide", "full"] as const;

export type ChatWidth = (typeof CHAT_WIDTHS)[number];

export interface DemoOptions {
  readonly theme: ThemeId;
  readonly state: DemoState;
  readonly width: ChatWidth;
  /** Hides the page's controls and gives the made-up window the whole viewport. */
  readonly capture: boolean;
}

export type OptionsResult =
  | { readonly ok: true; readonly options: DemoOptions }
  | { readonly ok: false; readonly error: string };

type Choice<T> = { readonly value: T } | { readonly error: string };

const DEFAULT_THEME: ThemeId = "save-point";
const CAPTURE_VALUES = ["1"] as const;
const anyOf = new Intl.ListFormat("en", { type: "disjunction" });

const choose = <T extends string>(
  params: URLSearchParams,
  name: string,
  allowed: readonly T[],
): Choice<T | null> => {
  const raw = params.get(name);
  if (raw === null) {
    return { value: null };
  }
  const match = allowed.find((option) => option === raw) ?? null;
  return match === null
    ? { error: `Unknown ${name} "${raw}" in the address. Use ${anyOf.format(allowed)}.` }
    : { value: match };
};

/**
 * Reads the demo's options from a query string.
 *
 * @param search - The page's query string, such as `?state=working`.
 * @returns The options, with defaults for missing parameters, or every problem found.
 */
export const readOptions = (search: string): OptionsResult => {
  const params = new URLSearchParams(search);
  const theme = choose(params, "theme", themeIds);
  const state = choose(params, "state", DEMO_STATES);
  const width = choose(params, "width", CHAT_WIDTHS);
  const capture = choose(params, "capture", CAPTURE_VALUES);
  if ("value" in theme && "value" in state && "value" in width && "value" in capture) {
    const options: DemoOptions = {
      theme: theme.value ?? DEFAULT_THEME,
      state: state.value ?? "resting",
      width: width.value ?? "comfortable",
      capture: capture.value !== null,
    };
    return { ok: true, options };
  }
  const errors = [theme, state, width, capture].flatMap((choice) =>
    "error" in choice ? [choice.error] : [],
  );
  return { ok: false, error: errors.join(" ") };
};
