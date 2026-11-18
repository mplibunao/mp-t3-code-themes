// Entry point of `pnpm previews:capture [id]`. Runs under Bun and supplies the Bun-backed
// file-system, path, and process services to scripts/lib/capture.ts.

import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Console, Effect } from "effect";
import { parseArgs } from "node:util";
import { isThemeId, themeIds, type ThemeId } from "../src/catalog.ts";
import { capturePreviews } from "./lib/capture.ts";
import { Reported, reportFailure } from "./lib/reported.ts";

const USAGE = `Usage: bun scripts/capture.ts [id]

Builds the demo, serves it on 127.0.0.1:4173, and records one theme's previews from its running
animations into previews/<id>/: resting.png, ready.png, working.png, waiting.png, and preview.gif.
Without an id, the theme is save-point. Needs ffmpeg on the PATH and nothing else on port 4173.`;

const DEFAULT_THEME: ThemeId = "save-point";
const FAILURE = 1;
const USAGE_FAILURE = 2;
// process.argv starts with the runtime and the script.
const FIRST_ARGUMENT = 2;

type Command = { readonly name: "help" } | { readonly name: "capture"; readonly id: ThemeId };

const usageFailure = (problem: string) =>
  Console.error(`${problem}\n\n${USAGE}`).pipe(
    Effect.andThen(Effect.fail(new Reported({ exitCode: USAGE_FAILURE }))),
  );

const parse = (args: readonly string[]) =>
  parseArgs({
    args: [...args],
    options: { help: { type: "boolean", short: "h" } },
    allowPositionals: true,
    strict: true,
  });

const toCommand = ({
  values,
  positionals: [id = DEFAULT_THEME, ...rest],
}: ReturnType<typeof parse>): Effect.Effect<Command, Reported> => {
  if (values.help === true) {
    return Effect.succeed({ name: "help" });
  }
  if (rest.length > 0) {
    return usageFailure(`Unknown arguments: ${rest.join(" ")}. The command captures one theme.`);
  }
  if (!isThemeId(id)) {
    return usageFailure(`Unknown theme: ${id}. The themes are ${themeIds.join(", ")}.`);
  }
  return Effect.succeed({ name: "capture", id });
};

const parseCommand = (args: readonly string[]): Effect.Effect<Command, Reported> =>
  Effect.try({
    try: () => parse(args),
    catch: (error) => (error instanceof Error ? error.message : String(error)),
  }).pipe(Effect.catch(usageFailure), Effect.flatMap(toCommand));

const run = (command: Command) =>
  command.name === "help" ? Console.log(USAGE) : capturePreviews(command.id);

// The site build prints its own errors and fails with Reported, so each error is printed once.
const main = parseCommand(process.argv.slice(FIRST_ARGUMENT)).pipe(
  Effect.flatMap(run),
  Effect.catch((error) => reportFailure(error, FAILURE)),
  Effect.provide(BunServices.layer),
);

BunRuntime.runMain(main);
