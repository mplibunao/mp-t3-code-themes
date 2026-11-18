import {
  baseConfig,
  composeLintConfigs,
  nodeRuntimeConfig,
  vitestConfig,
} from "@mplibunao/oxlint-standards";
import { defineConfig } from "vite-plus";

// Generated files, synced Vale packages, tool lockfiles, and local working folders that
// git doesn't ignore. The formatter would otherwise rewrite them.
const ignorePatterns = [
  "themes/**",
  "previews/**",
  "dist/**",
  ".site-public/**",
  "styles/Google/**",
  "styles/ai-tells/**",
  "styles/ai-tells-commits/**",
  "styles/alex/**",
  "styles/write-good/**",
  "styles/config/templates/**",
  "pnpm-lock.yaml",
  "mise.lock",
  ".mise/**",
  "docs/plans/**",
  "docs/reviews/**",
  "docs/ledgers/**",
  "prompt-exports/**",
];

// Dependency directions. CLAUDE.md owns the table, and test/boundaries.test.ts replays it.
// The restricted-imports rule matches the text of an import, not the file it resolves to. When
// several overrides match a file, the last one's options replace the others', so each list
// below is complete for the files it names.

interface Restriction {
  group?: string[];
  regex?: string;
  message: string;
}

const restrictImports = (...patterns: Restriction[]): ["error", { patterns: Restriction[] }] => [
  "error",
  { patterns },
];

const restrictGlobals = (
  message: string,
  ...names: string[]
): ["error", ...Array<{ name: string; message: string }>] => [
  "error",
  ...names.map((name) => ({ name, message })),
];

// Relative imports that enter one of these top-level folders, through any number of `../`.
const into = (folders: string[], message: string): Restriction => ({
  regex: `^\\.{1,2}/(?:.*/)?(?:${folders.join("|")})(?:/|$)`,
  message,
});

const rendererMessage =
  "src/ builds themes in memory with no file-system, process, or Bun API. A builder returns a BuiltTheme, and scripts/lib/ writes it.";
const rendererFolders = into(
  ["scripts", "site", "test", "e2e"],
  "src/ doesn't import scripts/, site/, or the tests. The scripts import src/ instead.",
);
const rendererApis = (...allowed: string[]): Restriction => ({
  group: ["node:*", "bun", "bun:*", "@effect/*", ...allowed.map((name) => `!${name}`)],
  message: rendererMessage,
});
const rendererEffect: Restriction = {
  group: ["effect", "effect/*"],
  message: "The renderer is synchronous. Only src/theme-contract.ts imports Effect Schema.",
};

const scriptFolders = into(
  ["site", "test", "e2e"],
  "scripts/ doesn't import site/ or the tests. It reaches the site through the build output.",
);
const playwright: Restriction = {
  group: ["@playwright/*", "playwright", "playwright-core"],
  message: "Only the capture command uses Playwright.",
};
const bunMessage =
  "scripts/lib/ also runs under Vitest on Node. Use Effect's platform services, and supply the Bun layer from the entry point.";
const bunPlatform: Restriction = {
  group: ["@effect/platform-bun", "bun", "bun:*"],
  message: bunMessage,
};

const siteMessage =
  "The site imports only src/catalog.ts and its own modules, and loads themes with fetch. It uses no Effect, Node, or Bun API.";

const boundaries = [
  {
    files: ["src/**"],
    rules: {
      // Bun's types also declare these web APIs, so TypeScript alone doesn't keep them out.
      "no-restricted-globals": restrictGlobals(
        rendererMessage,
        "Bun",
        "process",
        "fetch",
        "navigator",
        "WebSocket",
        "EventSource",
        "BroadcastChannel",
        "Worker",
      ),
      "no-restricted-imports": restrictImports(rendererFolders, rendererApis()),
    },
  },
  {
    files: ["src/save-point/**"],
    rules: {
      "no-restricted-imports": restrictImports(rendererFolders, rendererApis(), rendererEffect),
    },
  },
  {
    // The PNG encoder compresses with node:zlib.
    files: ["src/save-point/png.ts"],
    rules: {
      "no-restricted-imports": restrictImports(
        rendererFolders,
        rendererApis("node:zlib"),
        rendererEffect,
      ),
    },
  },
  {
    files: ["src/catalog.ts"],
    rules: {
      "no-restricted-imports": restrictImports({
        regex: ".",
        message: "src/catalog.ts imports nothing, so the site can import it.",
      }),
    },
  },
  {
    files: ["scripts/**"],
    rules: { "no-restricted-imports": restrictImports(scriptFolders, playwright) },
  },
  {
    files: ["scripts/lib/**"],
    rules: {
      "no-restricted-globals": restrictGlobals(bunMessage, "Bun"),
      "no-restricted-imports": restrictImports(scriptFolders, playwright, bunPlatform),
    },
  },
  {
    files: ["scripts/capture.ts"],
    rules: { "no-restricted-imports": restrictImports(scriptFolders) },
  },
  {
    files: ["scripts/lib/capture.ts"],
    rules: { "no-restricted-imports": restrictImports(scriptFolders, bunPlatform) },
  },
  {
    files: ["site/**"],
    rules: {
      // site/vite.config.ts is checked with Bun's types, so TypeScript allows these there.
      "no-restricted-globals": restrictGlobals(siteMessage, "Bun", "process"),
      "no-restricted-imports": restrictImports(
        into(["scripts", "test", "e2e"], siteMessage),
        {
          // `./src/` from a file at the top of site/ is the site's own folder.
          group: ["**/src/**", "!./src/**", "!**/src/catalog.ts", "!**/src/catalog"],
          message: siteMessage,
        },
        {
          group: ["effect", "effect/*", "@effect/*", "node:*", "bun", "bun:*"],
          message: siteMessage,
        },
      ),
    },
  },
  {
    files: ["e2e/**"],
    rules: {
      "no-restricted-imports": restrictImports(
        into(["site"], "End-to-end tests reach the site only through the browser."),
      ),
    },
  },
];

export default defineConfig({
  fmt: {
    ignorePatterns,
  },
  lint: composeLintConfigs(baseConfig, vitestConfig, nodeRuntimeConfig, {
    ignorePatterns,
    rules: {
      // The layout needs parent imports, such as site/ to src/catalog.ts. The dependency-direction
      // overrides decide which of them are allowed.
      "import/no-relative-parent-imports": "off",
    },
    overrides: [
      ...boundaries,
      {
        // Size limits don't fit test files. Depth, complexity, and parameter limits still apply.
        files: ["test/**", "e2e/**"],
        rules: {
          "@typescript-eslint/no-unsafe-type-assertion": "off",
          "import/max-dependencies": "off",
          "max-lines": "off",
          "max-lines-per-function": "off",
          "max-statements": "off",
          "no-magic-numbers": "off",
        },
      },
      {
        // A declaration file that only references ambient types is a script on purpose.
        files: ["**/*.d.ts"],
        rules: { "import/unambiguous": "off" },
      },
    ],
  }),
  staged: {
    // In order, so the linter reads the formatted file.
    "*": ["vp fmt --no-error-on-unmatched-pattern", "vp lint --no-error-on-unmatched-pattern"],
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
