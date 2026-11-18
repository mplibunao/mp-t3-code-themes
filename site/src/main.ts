// The demo's entry point: reads the query parameters, builds the made-up window, wires the
// controls, and loads the selected theme. After the first theme is applied, background included,
// it sets data-demo-ready on <html>, which the browser tests and the capture command wait for.

import { catalog, isThemeId, type ThemeId } from "../../src/catalog.ts";
import { loadTheme } from "./load-theme.ts";
import { buildMockup, requireElement } from "./mockup.ts";
import { CHAT_WIDTHS, readOptions, type ChatWidth, type DemoOptions } from "./options.ts";
import { createStateController, isDemoState, type StateController } from "./state.ts";
import {
  createThemeApplication,
  prepareTheme,
  type PreparedTheme,
  type ThemeApplication,
} from "./theme-application.ts";

const root = document.documentElement;

const page = {
  themeSelect: requireElement(document, "#theme-select", HTMLSelectElement),
  widthSelect: requireElement(document, "#width-select", HTMLSelectElement),
  stateButtons: [...document.querySelectorAll("[data-demo-state]")].filter(
    (element) => element instanceof HTMLButtonElement,
  ),
  status: requireElement(document, "#demo-status", HTMLElement),
  statusText: requireElement(document, "#demo-status-text", HTMLElement),
  retry: requireElement(document, "#demo-retry", HTMLButtonElement),
  viewport: requireElement(document, "#mock-viewport", HTMLElement),
};

const showStatus = (
  kind: "loading" | "error",
  text: string,
  retry: (() => void) | null = null,
): void => {
  page.status.dataset["kind"] = kind;
  page.statusText.textContent = text;
  page.retry.hidden = retry === null;
  page.retry.onclick = retry;
  page.status.hidden = false;
};

const clearStatus = (): void => {
  page.status.hidden = true;
};

const showState = (state: string): void => {
  for (const button of page.stateButtons) {
    button.setAttribute("aria-pressed", String(button.dataset["demoState"] === state));
  }
};

// T3 Code sets the chat width on <html> too, and the timeline lane and the composer both read it.
const applyWidth = (width: ChatWidth): void => {
  root.dataset["chatWidth"] = width;
};

// One load at a time: a new selection aborts the previous load, and a failed load leaves the
// previous theme on screen. Nothing retries without the Retry button.
class ThemeLoader {
  readonly #apply: ThemeApplication = createThemeApplication(root);
  readonly #onApplied: (first: boolean) => void;
  #loaded: ThemeId | null = null;
  #pending: AbortController | null = null;

  /** @param onApplied - Called after each theme is applied; `first` is true for the first one. */
  public constructor(onApplied: (first: boolean) => void) {
    this.#onApplied = onApplied;
  }

  /**
   * Loads a theme, unless it's the one on screen.
   *
   * @param id - A catalogued theme.
   */
  public select(id: ThemeId): void {
    if (id === this.#loaded) {
      this.#pending?.abort();
      clearStatus();
      return;
    }
    this.#load(id);
  }

  #load(id: ThemeId): void {
    this.#pending?.abort();
    const controller = new AbortController();
    this.#pending = controller;
    showStatus("loading", `Loading ${catalog[id].name}`);
    loadTheme(id, controller.signal)
      .then(prepareTheme)
      .then(
        (theme) => {
          this.#commit(id, controller.signal, theme);
        },
        (error: unknown) => {
          this.#fail(id, controller.signal, error);
        },
      );
  }

  // A newer selection aborted this load, so the newer one owns the page.
  #commit(id: ThemeId, signal: AbortSignal, theme: PreparedTheme): void {
    if (signal.aborted) {
      return;
    }
    this.#apply(theme);
    const first = this.#loaded === null;
    this.#loaded = id;
    clearStatus();
    this.#onApplied(first);
  }

  #fail(id: ThemeId, signal: AbortSignal, error: unknown): void {
    if (signal.aborted) {
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    showStatus("error", message, () => {
      this.#load(id);
    });
  }
}

const fillThemeSelect = (selected: ThemeId): void => {
  for (const [id, entry] of Object.entries(catalog)) {
    page.themeSelect.append(new Option(entry.name, id, false, id === selected));
  }
};

const wireControls = (states: StateController, loader: ThemeLoader): void => {
  for (const button of page.stateButtons) {
    // A pressed state button doesn't take focus, so pressing Ready while the composer has focus
    // doesn't rest the camp on the way. Each state places focus itself.
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("click", () => {
      const state = button.dataset["demoState"] ?? "";
      if (isDemoState(state)) {
        states.set(state);
      }
    });
  }
  page.themeSelect.addEventListener("change", () => {
    if (isThemeId(page.themeSelect.value)) {
      loader.select(page.themeSelect.value);
    }
  });
  page.widthSelect.addEventListener("change", () => {
    const width = CHAT_WIDTHS.find((option) => option === page.widthSelect.value);
    if (width) {
      applyWidth(width);
    }
  });
};

const start = (options: DemoOptions): void => {
  root.toggleAttribute("data-capture", options.capture);
  applyWidth(options.width);
  page.widthSelect.value = options.width;
  fillThemeSelect(options.theme);
  const states = createStateController(buildMockup(page.viewport), showState);
  states.set(options.state);
  // A theme change starts the new theme at rest.
  const loader = new ThemeLoader((first) => {
    if (first) {
      root.dataset["demoReady"] = "true";
    } else {
      states.set("resting");
    }
  });
  wireControls(states, loader);
  loader.select(options.theme);
};

const parsed = readOptions(window.location.search);
if (parsed.ok) {
  start(parsed.options);
} else {
  showStatus("error", parsed.error);
}
