import { expect, test, type Page } from "@playwright/test";

// The demo against the built site, with the committed Save Point files. Animations keep running:
// the tests read the computed animation names and display of the theme's pseudo-elements, and never
// pause or seek an animation.

const CONVERSATION = '[data-workspace-area="conversation"]';
const FORM = "[data-chat-composer-form]";
const CARD = "[data-chat-composer-main-surface]";
const LIVE_ROW = '[data-timeline-row-kind="working"]';
const DRAWER = "[data-chat-composer-top-drawer]";
const PRIMARY_ACTION = `${FORM} button[type="submit"]`;

const CAMP_ANIMATIONS = "sp-fire-blaze, sp-hammer, sp-dots, sp-cast";
const WORKING_ANIMATIONS = `${CAMP_ANIMATIONS}, sp-encounter, sp-knight-path, sp-monster-path, sp-tick`;
const SKY_ANIMATIONS = "sp-sky, sp-sky-cast, sp-flap";
const READY_ANIMATIONS = "sp-fire-low, sp-blink";
const WAITING_ANIMATIONS = "sp-fire-low, sp-bang";
const RUN_LABELS = ["Stop generation", "Stopping", "Queue message", "Steer message"];

interface PseudoStyle {
  readonly animation: string;
  readonly display: string;
}

const pseudoStyle = (page: Page, selector: string, pseudo = "::before"): Promise<PseudoStyle> =>
  page.locator(selector).evaluate((element, which) => {
    const style = getComputedStyle(element, which);
    return { animation: style.animationName, display: style.display };
  }, pseudo);

const open = async (page: Page, query = ""): Promise<void> => {
  await page.goto(`./${query}`);
  await expect(page.locator("html")).toHaveAttribute("data-demo-ready", "true");
};

const stateButton = (page: Page, name: string) =>
  page.getByRole("group", { name: "Agent state" }).getByRole("button", { name, exact: true });

// The card stage's running animations, each with the time it started. A restarted animation is a
// new object with a later start.
const cardAnimations = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    document.getAnimations().flatMap((animation) => {
      const { effect } = animation;
      const onCard =
        effect instanceof KeyframeEffect &&
        effect.pseudoElement === "::before" &&
        effect.target?.matches("[data-chat-composer-main-surface]") === true;
      return onCard && animation instanceof CSSAnimation
        ? [`${animation.animationName}@${String(animation.startTime)}`]
        : [];
    }),
  );

test("the state buttons drive the theme through real focus and markers", async ({ page }) => {
  await open(page);
  const editor = page.getByRole("textbox", { name: "Message" });
  const form = page.locator(FORM);
  await expect(stateButton(page, "Resting")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => pseudoStyle(page, CARD)).toEqual({ animation: "none", display: "block" });

  await stateButton(page, "Ready").click();
  await expect(editor).toBeFocused();
  expect(await form.evaluate((element) => element.matches(":focus-within"))).toBe(true);
  await expect
    .poll(() => pseudoStyle(page, CARD))
    .toEqual({ animation: READY_ANIMATIONS, display: "block" });

  // Pressing the current state again changes nothing and restarts nothing.
  await expect
    .poll(async () => (await cardAnimations(page)).filter((entry) => !entry.endsWith("@null")))
    .toHaveLength(2);
  const readyAnimations = await cardAnimations(page);
  await stateButton(page, "Ready").click();
  await expect(editor).toBeFocused();
  expect(await cardAnimations(page)).toEqual(readyAnimations);

  await stateButton(page, "Working").click();
  await expect(page.locator(LIVE_ROW)).toHaveCount(1);
  await expect(page.locator(PRIMARY_ACTION)).toHaveAttribute("aria-label", "Stop generation");
  await expect
    .poll(() => pseudoStyle(page, CARD))
    .toEqual({ animation: WORKING_ANIMATIONS, display: "block" });
  await expect
    .poll(async () => (await pseudoStyle(page, CONVERSATION, "::after")).animation)
    .toBe(SKY_ANIMATIONS);

  await stateButton(page, "Waiting").click();
  await expect(page.locator(DRAWER)).toHaveCount(1);
  await expect(page.locator(LIVE_ROW)).toHaveCount(0);
  await expect(page.locator(PRIMARY_ACTION)).toHaveAttribute("aria-label", "Submit message");
  await expect
    .poll(() => pseudoStyle(page, FORM))
    .toEqual({ animation: WAITING_ANIMATIONS, display: "block" });

  await stateButton(page, "Resting").click();
  await expect(page.locator(DRAWER)).toHaveCount(0);
  await expect.poll(() => pseudoStyle(page, CARD)).toEqual({ animation: "none", display: "block" });

  // Focus moving into the idle composer makes it ready, and focus leaving it rests it again.
  await editor.click();
  await expect(stateButton(page, "Ready")).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => pseudoStyle(page, CARD))
    .toEqual({ animation: READY_ANIMATIONS, display: "block" });
  await page.locator(CONVERSATION).click({ position: { x: 20, y: 20 } });
  await expect(stateButton(page, "Resting")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => pseudoStyle(page, CARD)).toEqual({ animation: "none", display: "block" });
});

test("a run label keeps the working stage when the live row is gone", async ({ page }) => {
  await open(page, "?state=working");
  // A virtualized timeline can drop the live row while the run goes on.
  await page.locator(LIVE_ROW).evaluate((row) => {
    row.remove();
  });
  const action = page.locator(PRIMARY_ACTION);
  for (const label of RUN_LABELS) {
    await action.evaluate((button, value) => {
      button.setAttribute("aria-label", value);
    }, label);
    await expect
      .poll(() => pseudoStyle(page, CARD), { message: label })
      .toEqual({ animation: WORKING_ANIMATIONS, display: "block" });
    await expect
      .poll(async () => (await pseudoStyle(page, CONVERSATION, "::after")).animation, {
        message: label,
      })
      .toBe(SKY_ANIMATIONS);
  }
  await action.evaluate((button) => {
    button.setAttribute("aria-label", "Submit message");
  });
  await expect.poll(() => pseudoStyle(page, CARD)).toEqual({ animation: "none", display: "block" });
});

test("waiting moves the stage onto the drawer and hides the card's", async ({ page }) => {
  await open(page, "?state=waiting");
  await expect.poll(() => pseudoStyle(page, CARD)).toMatchObject({ display: "none" });
  const stage = await page.locator(FORM).evaluate((form) => {
    const style = getComputedStyle(form, "::before");
    const anchor = form instanceof HTMLElement ? form.offsetParent?.getBoundingClientRect() : null;
    const drawer = form.querySelector("[data-chat-composer-top-drawer]")?.getBoundingClientRect();
    return {
      display: style.display,
      animation: style.animationName,
      left: Number.parseFloat(style.left),
      right: Number.parseFloat(style.right),
      bottom: Number.parseFloat(style.bottom),
      anchor: anchor && {
        top: anchor.top,
        left: anchor.left,
        right: anchor.right,
        height: anchor.height,
      },
      drawer: drawer && { top: drawer.top, left: drawer.left, right: drawer.right },
    };
  });
  expect(stage).toMatchObject({ display: "block", animation: WAITING_ANIMATIONS });
  expect(stage.anchor).toBeDefined();
  expect(stage.drawer).toBeDefined();
  const { anchor, drawer } = stage;
  if (!anchor || !drawer) {
    return;
  }
  // The stage's bottom edge is the top of the element it's positioned in, which is the drawer's top
  // edge, and its sides line up with the drawer's.
  expect(stage.bottom).toBeCloseTo(anchor.height, 0);
  expect(drawer.top).toBeCloseTo(anchor.top, 0);
  expect(anchor.left + stage.left).toBeCloseTo(drawer.left, 0);
  expect(anchor.right - stage.right).toBeCloseTo(drawer.right, 0);
});

test.describe("in a composer narrower than 30rem", () => {
  test.use({ viewport: { width: 480, height: 640 } });

  test("the working camp runs without encounters", async ({ page }) => {
    await open(page, "?state=working");
    const shellWidth = await page
      .locator('[data-slot="composer-shell"]')
      .evaluate((shell) => shell.getBoundingClientRect().width);
    expect(shellWidth).toBeLessThanOrEqual(480);
    await expect
      .poll(() => pseudoStyle(page, CARD))
      .toEqual({ animation: CAMP_ANIMATIONS, display: "block" });
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the theme's pseudo-elements don't animate in any state", async ({ page }) => {
    for (const state of ["ready", "working", "waiting"]) {
      await open(page, `?state=${state}`);
      const styles = {
        stars: await pseudoStyle(page, CONVERSATION, "::before"),
        sky: await pseudoStyle(page, CONVERSATION, "::after"),
        card: await pseudoStyle(page, CARD),
        drawer: await pseudoStyle(page, FORM),
      };
      for (const [name, style] of Object.entries(styles)) {
        expect(style.animation, `${state}: ${name}`).toBe("none");
      }
      const running = await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.effect instanceof KeyframeEffect && animation.effect.pseudoElement,
            ).length,
      );
      expect(running, state).toBe(0);
    }
  });
});

test("the theme files load from the project's base path", async ({ page, baseURL }) => {
  const base = new URL(baseURL ?? "");
  const paths: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === base.origin) {
      paths.push(url.pathname);
    }
  });
  const theme = page.waitForResponse((response) => response.url().endsWith(".json"));
  const image = page.waitForResponse((response) => response.url().endsWith(".png"));
  await open(page);

  expect((await theme).url()).toBe(new URL("themes/save-point.json", base).href);
  expect((await theme).status()).toBe(200);
  expect((await image).url()).toBe(new URL("themes/save-point.png", base).href);
  expect((await image).status()).toBe(200);
  expect(paths.filter((path) => !path.startsWith(base.pathname))).toEqual([]);

  const background = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--theme-background-image"),
  );
  expect(background).toBe(`url("${base.pathname}themes/save-point.png")`);
  const size = await page.evaluate(async (source) => {
    const decoded = new Image();
    decoded.src = source;
    await decoded.decode();
    return [decoded.naturalWidth, decoded.naturalHeight];
  }, `${base.pathname}themes/save-point.png`);
  expect(size).toEqual([640, 400]);
});

test("the theme's CSS parses whole and fetches nothing", async ({ page, baseURL, request }) => {
  const base = new URL(baseURL ?? "");
  const foreign: string[] = [];
  page.on("request", (sent) => {
    const url = new URL(sent.url());
    if (url.protocol !== "data:" && url.origin !== base.origin) {
      foreign.push(url.href);
    }
  });
  await open(page, "?state=working");
  const source: unknown = await (await request.get("themes/save-point.json")).json();
  const css = typeof source === "object" && source && "css" in source ? String(source.css) : "";
  const count = (pattern: RegExp) => css.match(pattern)?.length ?? 0;

  const parsed = await page.evaluate(() => {
    const rules: CSSRule[] = [];
    const walk = (list: CSSRuleList): void => {
      for (const rule of list) {
        rules.push(rule);
        if (rule instanceof CSSGroupingRule) {
          walk(rule.cssRules);
        }
      }
    };
    for (const sheet of document.adoptedStyleSheets) {
      walk(sheet.cssRules);
    }
    // A url() that isn't a data: address, image-set(), src(), and @import all fetch.
    const fetches = /url\(\s*(?!["']?data:)|image-set\(|(?:^|[^\w-])src\(/iu;
    return {
      sheets: document.adoptedStyleSheets.length,
      fetching: rules
        .filter((rule) => rule instanceof CSSImportRule || fetches.test(rule.cssText))
        .map((rule) => rule.cssText.slice(0, 200)),
      keyframes: rules.filter((rule) => rule instanceof CSSKeyframesRule).length,
      properties: rules.filter((rule) => rule instanceof CSSPropertyRule).length,
      containers: rules.filter((rule) => rule instanceof CSSContainerRule).length,
      media: rules.filter((rule) => rule instanceof CSSMediaRule).length,
    };
  });

  expect(parsed).toEqual({
    sheets: 1,
    fetching: [],
    keyframes: count(/@keyframes\s/gu),
    properties: count(/@property\s/gu),
    containers: count(/@container\s/gu),
    media: count(/@media\s/gu),
  });
  expect(parsed.keyframes).toBeGreaterThan(0);
  expect(foreign).toEqual([]);
});
