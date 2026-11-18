// `pnpm build` and `pnpm dev`: copy the committed theme files into .site-public/themes/, then run
// Vite in site/. The site serves the files that `pnpm themes:check` compares, and nothing here
// runs the renderer.

import { Console, Data, Effect, type FileSystem, Path, Runtime } from "effect";
import { ChildProcess, type ChildProcessSpawner } from "effect/process";
import { themeIds } from "../../src/catalog.ts";
import { copyCommittedThemes } from "./artifacts.ts";

/** `build` writes dist/. `dev` serves the site until it's interrupted. */
export type SiteCommand = "build" | "dev";

const FAILURE = 1;

/** The message is already on the terminal, so the runtime only sets the exit code. */
export class Reported extends Data.TaggedError("Reported")<{ readonly exitCode: number }> {
  public override readonly [Runtime.errorReported] = false;

  public override get [Runtime.errorExitCode](): number {
    return this.exitCode;
  }
}

// Vite shares the terminal, so its own output and Ctrl-C reach it directly. Closing the scope
// stops it when the command is interrupted.
const runVite = Effect.fnUntraced(function* (root: string, command: SiteCommand) {
  const path = yield* Path.Path;
  const handle = yield* ChildProcess.make(
    path.join(root, "node_modules", ".bin", "vp"),
    [command],
    {
      cwd: path.join(root, "site"),
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  return yield* handle.exitCode;
});

const prepareAndRun = Effect.fnUntraced(function* (command: SiteCommand) {
  const path = yield* Path.Path;
  const root = yield* path.fromFileUrl(new URL("../..", import.meta.url));
  yield* copyCommittedThemes(
    path.join(root, "themes"),
    path.join(root, ".site-public", "themes"),
    themeIds,
  );
  const exitCode = yield* Effect.scoped(runVite(root, command));
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
> =>
  prepareAndRun(command).pipe(
    Effect.catch((error) =>
      error instanceof Reported
        ? Effect.fail(error)
        : Console.error(error.message).pipe(
            Effect.andThen(Effect.fail(new Reported({ exitCode: FAILURE }))),
          ),
    ),
  );
