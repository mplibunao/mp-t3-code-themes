// `pnpm build` and `pnpm dev`: copy the committed theme files into .site-public/themes/, then run
// Vite in site/. The site serves the files that `pnpm themes:check` compares, and nothing here
// runs the renderer.

import { Effect, type FileSystem, Path } from "effect";
import { ChildProcess, type ChildProcessSpawner } from "effect/process";
import { themeIds } from "../../src/catalog.ts";
import { copyCommittedThemes } from "./artifacts.ts";
import { Reported, reportFailure } from "./reported.ts";

/** `build` writes dist/. `dev` serves the site until it's interrupted. */
export type SiteCommand = "build" | "dev";

const FAILURE = 1;

/** The repository root, found from this file's place in scripts/lib/. */
export const repositoryRoot = Effect.gen(function* () {
  const path = yield* Path.Path;
  return yield* path.fromFileUrl(new URL("../..", import.meta.url));
});

/**
 * The repository's `vp`, with site/ as its working folder, so that Vite reads site/vite.config.ts.
 *
 * @param args - The arguments to `vp`.
 * @param options - Process options. The working folder is always site/.
 * @returns The handle of the spawned `vp`. Closing the caller's scope stops it.
 */
export const spawnSiteVite = Effect.fnUntraced(function* (
  args: readonly string[],
  options: ChildProcess.CommandOptions,
) {
  const path = yield* Path.Path;
  const root = yield* repositoryRoot;
  return yield* ChildProcess.make(path.join(root, "node_modules", ".bin", "vp"), [...args], {
    ...options,
    cwd: path.join(root, "site"),
  });
});

// Vite shares the terminal, so its own output and Ctrl-C reach it directly. Closing the scope
// stops it when the command is interrupted.
const runVite = Effect.fnUntraced(function* (command: SiteCommand) {
  const vite = yield* spawnSiteVite([command], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return yield* vite.exitCode;
});

const prepareAndRun = Effect.fnUntraced(function* (command: SiteCommand) {
  const path = yield* Path.Path;
  const root = yield* repositoryRoot;
  yield* copyCommittedThemes(
    path.join(root, "themes"),
    path.join(root, ".site-public", "themes"),
    themeIds,
  );
  const exitCode = yield* Effect.scoped(runVite(command));
  if (exitCode !== 0) {
    return yield* new Reported({ exitCode });
  }
});

/**
 * Copies the committed theme files for the site, then runs `vp <command>` in site/. A failure
 * prints its message and exits 1. A Vite failure exits with Vite's code, after Vite's own output.
 *
 * @param command - The Vite command.
 * @returns An effect that needs the file-system, path, and process services.
 */
export const runSite = (
  command: SiteCommand,
): Effect.Effect<
  void,
  Reported,
  FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner
> => prepareAndRun(command).pipe(Effect.catch((error) => reportFailure(error, FAILURE)));
