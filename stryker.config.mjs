// The mutation lane: `pnpm test:mutation`. A reviewer runs it and decides what each surviving
// mutant means. It doesn't fail on the mutation score, and CI doesn't run it.
//
// It mutates code with behaviour: the file contract, the renderer's helpers and CSS construction,
// atomic publishing, and the installer. It leaves out the artwork, the palette, the sprite
// catalog, and the CSS fragments that are only text.
//
// What this lane can't catch, and the check that does, is explained in
// docs/decisions/001-repository-shape.md#committed-theme-files.

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
const config = {
  // Stryker looks for its plugins next to its own package. pnpm keeps the Vitest runner
  // elsewhere, so the runner is named by the address it resolves to from here.
  plugins: [import.meta.resolve("@stryker-mutator/vitest-runner")],
  testRunner: "vitest",
  vitest: { configFile: "vite.config.ts" },
  coverageAnalysis: "perTest",
  // Stryker rewrites the relative paths in this tsconfig file so that they resolve in its
  // sandbox, and parses it with TypeScript's JavaScript API, which TypeScript 7 doesn't have.
  // No tsconfig here has a relative path that leaves the repository, so the sandbox needs no
  // rewrite. An empty name resolves to the repository folder, which isn't a file, so Stryker
  // skips it.
  tsconfigFile: "",
  mutate: [
    "src/theme-contract.ts",
    "src/save-point/index.ts",
    "src/save-point/pixels.ts",
    "src/save-point/sprite.ts",
    "src/save-point/tone.ts",
    "src/save-point/png.ts",
    "src/save-point/css/context.ts",
    "src/save-point/css/encounters.ts",
    "src/save-point/css/properties.ts",
    "src/save-point/css/index.ts",
    "scripts/lib/build-themes.ts",
    "scripts/lib/artifacts.ts",
    "scripts/lib/install.ts",
  ],
  reporters: ["clear-text", "html", "progress"],
  thresholds: { high: 80, low: 60, break: null },
};

export default config;
