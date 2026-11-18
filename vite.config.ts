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

export default defineConfig({
  fmt: {
    ignorePatterns,
  },
  lint: composeLintConfigs(baseConfig, vitestConfig, nodeRuntimeConfig, {
    ignorePatterns,
    overrides: [
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
