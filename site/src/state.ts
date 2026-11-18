// The demo's four states and the focus rules between them. A state is a set of real DOM markers
// plus a focus position, which a theme reads the way it reads T3 Code: focus inside the composer
// form while ready, a live timeline row and a Stop generation label while working, and a question
// drawer while waiting.

import type { Mockup } from "./mockup.ts";

export const DEMO_STATES = ["resting", "ready", "working", "waiting"] as const;

export type DemoState = (typeof DEMO_STATES)[number];

export const isDemoState = (value: string): value is DemoState =>
  DEMO_STATES.some((state) => state === value);

export interface StateController {
  readonly current: () => DemoState;
  /** Changes the markers and focus synchronously. Setting the current state again does nothing. */
  readonly set: (next: DemoState) => void;
}

const blurInside = (form: HTMLFormElement): void => {
  const active = document.activeElement;
  if (active instanceof HTMLElement && form.contains(active)) {
    active.blur();
  }
};

const leavesForm = (form: HTMLFormElement, event: FocusEvent): boolean =>
  !(event.relatedTarget instanceof Node && form.contains(event.relatedTarget));

// Resting and waiting need focus outside the form. Working leaves focus where it is, as T3 Code
// does after a message is sent.
const placeFocus = (mockup: Mockup, state: DemoState): void => {
  if (state === "ready") {
    mockup.editor.focus();
  } else if (state !== "working") {
    blurInside(mockup.form);
  }
};

/**
 * Starts the demo at rest and follows focus between resting and ready: focus entering the idle
 * form makes it ready, and focus leaving the whole form makes it rest again. Focus doesn't change
 * working or waiting.
 *
 * @param mockup - The made-up window.
 * @param onChange - Called after each change, with the new state.
 * @returns The controller.
 */
export const createStateController = (
  mockup: Mockup,
  onChange: (state: DemoState) => void,
): StateController => {
  let state: DemoState = "resting";
  const set = (next: DemoState): void => {
    if (next === state) {
      return;
    }
    state = next;
    mockup.setMarkers({ working: next === "working", drawer: next === "waiting" });
    placeFocus(mockup, next);
    onChange(next);
  };
  mockup.form.addEventListener("focusin", () => {
    if (state === "resting") {
      set("ready");
    }
  });
  mockup.form.addEventListener("focusout", (event) => {
    if (state === "ready" && leavesForm(mockup.form, event)) {
      set("resting");
    }
  });
  return { current: () => state, set };
};
