// Entry point of `pnpm themes:build`, `pnpm themes:check`, and `pnpm themes:install`. Runs under
// Bun and supplies the Bun-backed file-system, path, and process services to scripts/lib/.

import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Console, Data, Effect, Option, Path } from "effect";
import { homedir } from "node:os";
import { parseArgs } from "node:util";
import { isThemeId, themeIds, type ThemeId } from "../src/catalog.ts";
import { checkThemes, writeThemes } from "./lib/artifacts.ts";
import { buildThemes } from "./lib/build-themes.ts";
import { installThemes } from "./lib/install.ts";
import { reportFailure } from "./lib/reported.ts";

const USAGE = `Usage: bun scripts/themes.ts <command>

Commands:
  build    Build every theme and write its files into themes/.
  check    Build every theme in memory and compare it with the files in themes/. Writes nothing.
  install [id...] [--base-dir DIR]
           Copy the files of the named themes, or of every theme, from themes/ into
           DIR/userdata/themes, then check them with t3 theme show. Without --base-dir, DIR is
           T3CODE_HOME, or ~/.t3 when that isn't set.`;

const FAILURE = 1;
const USAGE_FAILURE = 2;
// process.argv starts with the runtime and the script.
const FIRST_ARGUMENT = 2;

class UsageError extends Data.TaggedError("UsageError")<{ readonly message: string }> {}

type Command =
  | { readonly name: "build" | "check" | "help" }
  | {
      readonly name: "install";
      readonly ids: readonly ThemeId[];
      readonly baseDir: Option.Option<string>;
    };

type Install = Extract<Command, { readonly name: "install" }>;

const usageError = (problem: string) => new UsageError({ message: `${problem}\n\n${USAGE}` });

const parse = (args: readonly string[]) =>
  parseArgs({
    args: [...args],
    options: { "base-dir": { type: "string" }, help: { type: "boolean", short: "h" } },
    allowPositionals: true,
    strict: true,
  });

// No ids means every theme, and a repeated id is installed once.
const parseInstall = (
  args: readonly string[],
  baseDir: Option.Option<string>,
): Effect.Effect<Install, UsageError> => {
  const unknown = args.filter((id) => !isThemeId(id));
  if (unknown.length > 0) {
    const problem = `Unknown theme: ${unknown.join(", ")}. The themes are ${themeIds.join(", ")}.`;
    return Effect.fail(usageError(problem));
  }
  if (Option.exists(baseDir, (dir) => dir.trim() === "")) {
    return Effect.fail(usageError("--base-dir needs a folder."));
  }
  const ids = args.filter(isThemeId);
  return Effect.succeed({
    name: "install",
    ids: ids.length > 0 ? [...new Set(ids)] : themeIds,
    baseDir,
  });
};

const toCommand = (
  args: readonly string[],
  { values, positionals: [name, ...rest] }: ReturnType<typeof parse>,
): Effect.Effect<Command, UsageError> => {
  if (values.help === true) {
    return Effect.succeed({ name: "help" });
  }
  const baseDir = Option.fromNullishOr(values["base-dir"]);
  if (name === "install") {
    return parseInstall(rest, baseDir);
  }
  if ((name === "build" || name === "check") && rest.length === 0 && Option.isNone(baseDir)) {
    return Effect.succeed({ name });
  }
  const problem = args.length === 0 ? "No command given." : `Unknown arguments: ${args.join(" ")}`;
  return Effect.fail(usageError(problem));
};

const parseCommand = (args: readonly string[]): Effect.Effect<Command, UsageError> =>
  Effect.try({
    try: () => parse(args),
    catch: (error) => usageError(error instanceof Error ? error.message : String(error)),
  }).pipe(Effect.flatMap((parsed) => toCommand(args, parsed)));

// themes/ at the repository root, relative to the working folder so that messages stay short.
const themesDirectory = Effect.gen(function* () {
  const path = yield* Path.Path;
  const root = yield* path.fromFileUrl(new URL("..", import.meta.url));
  return path.relative(process.cwd(), path.join(root, "themes")) || ".";
});

const buildOrCheck = Effect.fnUntraced(function* (name: "build" | "check", directory: string) {
  const themes = yield* buildThemes();
  if (name === "build") {
    const written = yield* writeThemes(directory, themes);
    return yield* Console.log(`Wrote ${written.join(", ")}.`);
  }
  const checked = yield* checkThemes(directory, themes);
  return yield* Console.log(`${checked.join(", ")} match the build.`);
});

const install = (command: Install, source: string) =>
  installThemes({
    ids: command.ids,
    source,
    baseDir: command.baseDir,
    t3Home: Option.fromNullishOr(process.env["T3CODE_HOME"]),
    home: homedir(),
  });

const run = Effect.fnUntraced(function* (command: Command) {
  if (command.name === "help") {
    return yield* Console.log(USAGE);
  }
  const directory = yield* themesDirectory;
  if (command.name === "install") {
    return yield* install(command, directory);
  }
  return yield* buildOrCheck(command.name, directory);
});

const main = parseCommand(process.argv.slice(FIRST_ARGUMENT)).pipe(
  Effect.flatMap(run),
  Effect.catch((error) =>
    reportFailure(error, error instanceof UsageError ? USAGE_FAILURE : FAILURE),
  ),
  Effect.provide(BunServices.layer),
);

BunRuntime.runMain(main);
