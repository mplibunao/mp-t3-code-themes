import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

// The dependency-direction table in CLAUDE.md, replayed through the real lint configuration.
// Each source goes into a scratch tree with the repository's layout. Its vite.config.ts
// re-exports the repository's own, so the override globs match the scratch paths.
const cases = [
  // src/catalog.ts imports nothing.
  { verdict: "rejects", file: "src/catalog.ts", source: 'import "./theme-contract.ts";' },

  // The contract and the renderer.
  { verdict: "allows", file: "src/theme-contract.ts", source: 'import { Schema } from "effect";' },
  {
    verdict: "allows",
    file: "src/save-point/index.ts",
    source: 'import type { BuiltTheme } from "../theme-contract.ts";',
  },
  { verdict: "allows", file: "src/save-point/png.ts", source: 'import "node:zlib";' },
  {
    verdict: "rejects",
    file: "src/save-point/css/stage.ts",
    source: 'import "../../../scripts/lib/artifacts.ts";',
  },
  { verdict: "rejects", file: "src/save-point/landscape.ts", source: 'import "node:zlib";' },
  { verdict: "rejects", file: "src/save-point/tone.ts", source: 'import "effect";' },
  {
    verdict: "rejects",
    file: "src/save-point/colors.ts",
    source: "export const dir = process.cwd();",
  },
  {
    verdict: "rejects",
    file: "src/save-point/sprites.ts",
    source: 'export const page = fetch("https://example.com");',
  },

  // Scripts.
  {
    verdict: "allows",
    file: "scripts/lib/build-themes.ts",
    source: 'import "../../src/save-point/index.ts";',
  },
  { verdict: "allows", file: "scripts/themes.ts", source: 'import "@effect/platform-bun";' },
  { verdict: "allows", file: "scripts/lib/capture.ts", source: 'import "@playwright/test";' },
  { verdict: "rejects", file: "scripts/build-site.ts", source: 'import "../site/src/main.ts";' },
  {
    verdict: "rejects",
    file: "scripts/lib/artifacts.ts",
    source: 'import "@effect/platform-bun";',
  },
  {
    verdict: "rejects",
    file: "scripts/lib/install.ts",
    source: 'export const file = Bun.file("x");',
  },
  { verdict: "rejects", file: "scripts/dev.ts", source: 'import "@playwright/test";' },

  // The site.
  { verdict: "allows", file: "site/src/main.ts", source: 'import "../../src/catalog.ts";' },
  { verdict: "allows", file: "site/vite.config.ts", source: 'import "./src/main.ts";' },
  {
    verdict: "rejects",
    file: "site/src/load-theme.ts",
    source: 'import "../../src/theme-contract.ts";',
  },
  { verdict: "rejects", file: "site/src/state.ts", source: 'import "effect";' },
  { verdict: "rejects", file: "site/build.ts", source: 'export const file = Bun.file("x");' },

  // Tests.
  {
    verdict: "allows",
    file: "test/install.test.ts",
    source: 'import "../scripts/lib/install.ts";',
  },
  { verdict: "rejects", file: "e2e/demo.spec.ts", source: 'import "../site/src/state.ts";' },
  { verdict: "rejects", file: "site/src/mockup.ts", source: 'import "../../test/fixtures.ts";' },
];

const repository = fileURLToPath(new URL("..", import.meta.url));
const scratch = mkdtempSync(path.join(tmpdir(), "boundaries-"));
const blocked = new Set<string>();

beforeAll(() => {
  // The lint configuration loads its plugin package from the scratch tree's node_modules.
  symlinkSync(path.join(repository, "node_modules"), path.join(scratch, "node_modules"));
  writeFileSync(
    path.join(scratch, "package.json"),
    '{ "name": "boundary-probe", "type": "module" }\n',
  );
  writeFileSync(
    path.join(scratch, "vite.config.ts"),
    `export { default } from ${JSON.stringify(path.join(repository, "vite.config.ts"))};\n`,
  );
  for (const { file, source } of cases) {
    mkdirSync(path.dirname(path.join(scratch, file)), { recursive: true });
    writeFileSync(path.join(scratch, file), `${source}\n`);
  }

  // Named folders keep the linter out of the node_modules link.
  const folders = ["src", "scripts", "site", "test", "e2e"];
  const lint = spawnSync(
    path.join(repository, "node_modules/.bin/vp"),
    ["lint", "--format", "json", ...folders],
    // A synchronous child blocks Vitest's own hook timer, so the child carries the limit.
    { cwd: scratch, encoding: "utf8", timeout: 30_000 },
  );
  // The prohibited cases make the linter exit 1 with a JSON report. Anything else means it
  // didn't lint the cases, and its own output says why.
  if (lint.error || lint.status !== 1 || !lint.stdout.startsWith("{")) {
    throw new Error(
      `vp lint didn't report on the cases (exit ${lint.status ?? lint.signal}):\n${lint.stdout}${lint.stderr}`,
      { cause: lint.error },
    );
  }
  const report = JSON.parse(lint.stdout) as {
    diagnostics: Array<{ code: string; filename: string; severity: string }>;
  };
  // Only an error fails the gate, so a warning doesn't count as a rejection.
  for (const { code, filename, severity } of report.diagnostics) {
    const boundary =
      code === "eslint(no-restricted-imports)" || code === "eslint(no-restricted-globals)";
    if (boundary && severity === "error") {
      blocked.add(filename);
    }
  }
});

afterAll(() => {
  // Removes the node_modules link, not the repository's folder it points at.
  rmSync(scratch, { recursive: true, force: true });
});

describe("dependency directions", () => {
  it.each(cases)("$verdict `$source` in $file", ({ verdict, file }) => {
    expect(blocked.has(file)).toBe(verdict === "rejects");
  });
});
