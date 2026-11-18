// Entry point of `pnpm themes:build` and `pnpm themes:check`. Runs under Bun and supplies the
// Bun-backed file-system and path services to scripts/lib/.

import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Console, Data, Effect, Path, Runtime } from "effect";
import { checkThemes, writeThemes } from "./lib/artifacts.ts";
import { buildThemes } from "./lib/build-themes.ts";

const USAGE = `Usage: bun scripts/themes.ts <command>

Commands:
  build  Build every theme and write its files into themes/.
  check  Build every theme in memory and compare it with the files in themes/. Writes nothing.`;

const FAILURE = 1;
const USAGE_FAILURE = 2;
// process.argv starts with the runtime and the script.
const FIRST_ARGUMENT = 2;

class UsageError extends Data.TaggedError("UsageError")<{ readonly message: string }> {}

// The message is already on standard error, so the runtime only sets the exit code.
class Reported extends Data.TaggedError("Reported")<{ readonly exitCode: number }> {
  public override readonly [Runtime.errorReported] = false;

  public override get [Runtime.errorExitCode](): number {
    return this.exitCode;
  }
}

type Command = "build" | "check" | "help";

const parseCommand = (args: readonly string[]): Effect.Effect<Command, UsageError> => {
  const [name] = args;
  if (args.length === 1 && (name === "build" || name === "check")) {
    return Effect.succeed(name);
  }
  if (args.length === 1 && (name === "--help" || name === "-h")) {
    return Effect.succeed("help");
  }
  const problem = args.length === 0 ? "No command given." : `Unknown arguments: ${args.join(" ")}`;
  return Effect.fail(new UsageError({ message: `${problem}\n\n${USAGE}` }));
};

// themes/ at the repository root, relative to the working folder so that messages stay short.
const themesDirectory = Effect.gen(function* () {
  const path = yield* Path.Path;
  const root = yield* path.fromFileUrl(new URL("..", import.meta.url));
  return path.relative(process.cwd(), path.join(root, "themes")) || ".";
});

const run = Effect.fnUntraced(function* (command: Command) {
  if (command === "help") {
    return yield* Console.log(USAGE);
  }
  const directory = yield* themesDirectory;
  const themes = yield* buildThemes();
  if (command === "build") {
    const written = yield* writeThemes(directory, themes);
    return yield* Console.log(`Wrote ${written.join(", ")}.`);
  }
  const checked = yield* checkThemes(directory, themes);
  return yield* Console.log(`${checked.join(", ")} match the build.`);
});

const main = parseCommand(process.argv.slice(FIRST_ARGUMENT)).pipe(
  Effect.flatMap(run),
  Effect.catch((error) =>
    Console.error(error.message).pipe(
      Effect.andThen(
        Effect.fail(
          new Reported({ exitCode: error instanceof UsageError ? USAGE_FAILURE : FAILURE }),
        ),
      ),
    ),
  ),
  Effect.provide(BunServices.layer),
);

BunRuntime.runMain(main);
