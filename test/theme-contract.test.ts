import { Effect, Exit } from "effect";
import { describe, expect, it } from "vite-plus/test";
import { COLOR_ROLES, validateBuiltTheme } from "../src/theme-contract.ts";

const colors = Object.fromEntries(COLOR_ROLES.map((role) => [role, "#17152b"]));
const { terminalSelection: _removed, ...colorsWithoutOneRole } = colors;

// A hand-made theme that meets the contract. Each invalid case changes one part of it.
const document = {
  name: "Contract Fixture",
  appearance: "dark",
  canvas: "#17152b",
  accent: "#f0b765",
  colors,
  css: "body { color: #eeebff; }",
};
const theme = { id: "save-point", document, background: new Uint8Array([137, 80, 78, 71]) };

const withDocument = (changes: Record<string, unknown>) => ({
  ...theme,
  document: { ...document, ...changes },
});

const passes = (candidate: unknown) =>
  Exit.isSuccess(Effect.runSyncExit(validateBuiltTheme(candidate)));

const failure = (candidate: unknown) =>
  Effect.runSync(Effect.flip(validateBuiltTheme(candidate))).message;

describe("validateBuiltTheme", () => {
  it("accepts a theme that meets the contract, unchanged", () => {
    expect(Effect.runSync(validateBuiltTheme(theme))).toStrictEqual(theme);
  });

  it.each([
    {
      problem: "a reserved id",
      candidate: { ...theme, id: "t3-code" },
      reason: "doesn't reserve",
      path: '["id"]',
    },
    {
      problem: "an id that T3 Code doesn't read",
      candidate: { ...theme, id: "save_point" },
      reason: "lowercase letters, digits, and hyphens",
      path: '["id"]',
    },
    {
      problem: "an accent that isn't a hexadecimal colour",
      candidate: withDocument({ accent: "#f0b765f" }),
      reason: "hexadecimal colour",
      path: '["document"]["accent"]',
    },
    {
      problem: "a backslash in the CSS",
      candidate: withDocument({ css: 'a::before { content: "\\2014"; }' }),
      reason: "without a backslash",
      path: '["document"]["css"]',
    },
    {
      problem: "a missing role",
      candidate: withDocument({ colors: colorsWithoutOneRole }),
      reason: "Missing key",
      path: '["document"]["colors"]["terminalSelection"]',
    },
    {
      problem: "an unknown role",
      candidate: withDocument({ colors: { ...colors, sidebarAccent: "#17152b" } }),
      reason: "excess property",
      path: '["document"]["colors"]["sidebarAccent"]',
    },
    {
      problem: "a field outside the contract",
      candidate: withDocument({ version: 1 }),
      reason: "excess property",
      path: '["document"]["version"]',
    },
    {
      problem: "a build without the background that the catalog lists",
      candidate: { id: theme.id, document },
      reason: "Expected a background",
      path: '["background"]',
    },
  ])("rejects $problem and names $path", ({ candidate, reason, path }) => {
    const message = failure(candidate);
    expect(message).toContain(reason);
    expect(message).toContain(`at ${path}`);
  });

  // T3 Code 0.1.10 accepts at most 50,000 characters of CSS.
  it("accepts CSS of exactly 50,000 characters and rejects 50,001", () => {
    expect(passes(withDocument({ css: "a".repeat(50_000) }))).toBe(true);
    expect(failure(withDocument({ css: "a".repeat(50_001) }))).toContain('at ["document"]["css"]');
  });
});
