// `pnpm themes:install`: copies the committed theme files into a T3 Code home, then asks
// `t3 theme show` once whether T3 Code published them. It copies the files that
// `pnpm themes:check` compares and never rebuilds them, so the installed image doesn't depend on
// the Bun that runs the command.

import { Console, Effect, Option, Path, Predicate, Result, Stream } from "effect";
import type { PlatformError } from "effect/PlatformError";
import { ChildProcess, CommandLine } from "effect/process";
import type { ThemeId } from "../../src/catalog.ts";
import { publishFiles, readCommittedFiles } from "./artifacts.ts";

const SHOW_TIMEOUT = "10 seconds";
// How long `t3` has to exit after the timeout's SIGTERM before it gets SIGKILL.
const KILL_GRACE = "1 second";
// `t3 theme show` ends with `Environment theme: …` and then `Published themes: a, b.` or
// `Published themes: none (publish into <dir>).`
const SUMMARY_LINE = /^(?:Environment theme|Published themes): /u;
const PUBLISHED_LIST = /^Published themes: (?<list>.+)\.$/mu;
const NONE_PUBLISHED = "none (";
const INDENT = "  ";

/** The themes to install and the inputs that choose the T3 Code home. */
export interface InstallRequest {
  /** Catalogued ids, each once. */
  readonly ids: readonly ThemeId[];
  /** The folder that holds the committed theme files. */
  readonly source: string;
  /** The `--base-dir` value. */
  readonly baseDir: Option.Option<string>;
  /** The `T3CODE_HOME` value. */
  readonly t3Home: Option.Option<string>;
  /** The home folder, used when neither of the others is set. */
  readonly home: string;
}

interface ShowOutput {
  /** None when `t3` didn't finish in time. */
  readonly exitCode: Option.Option<number>;
  readonly stdout: string;
  readonly stderr: string;
}

// T3 Code's `t3 theme` commands use the same order. The result is absolute, so the printed
// `t3 theme set` command works from any folder.
const resolveBaseDir = Effect.fnUntraced(function* (request: InstallRequest) {
  const path = yield* Path.Path;
  const base = request.baseDir.pipe(
    Option.orElse(() => Option.filter(request.t3Home, (home) => home.trim() !== "")),
    Option.getOrElse(() => path.join(request.home, ".t3")),
  );
  return path.resolve(base);
});

const collect = (stream: Stream.Stream<Uint8Array, PlatformError>, into: string[]) =>
  Stream.runForEach(Stream.decodeText(stream), (text) => Effect.sync(() => into.push(text)));

// Both streams are read while the exit is awaited, so a full pipe can't stall `t3`. They're
// collected as they arrive, so a timeout still reports what `t3` printed. The timeout closes the
// scope, which stops the process.
const showThemes = Effect.fnUntraced(function* (baseDir: string) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = yield* Effect.scoped(
    Effect.gen(function* () {
      const handle = yield* ChildProcess.make("t3", ["theme", "show", "--base-dir", baseDir], {
        forceKillAfter: KILL_GRACE,
      });
      const [, , code] = yield* Effect.all(
        [collect(handle.stdout, stdout), collect(handle.stderr, stderr), handle.exitCode],
        { concurrency: "unbounded" },
      );
      return code;
    }),
  ).pipe(Effect.timeoutOption(SHOW_TIMEOUT));
  return { exitCode, stdout: stdout.join(""), stderr: stderr.join("") } satisfies ShowOutput;
});

// The ids `t3 theme show` lists, or why its output isn't such a list.
const publishedIds = (output: ShowOutput): Result.Result<readonly string[], string> => {
  if (Option.isNone(output.exitCode)) {
    return Result.fail(`t3 theme show didn't finish within ${SHOW_TIMEOUT}.`);
  }
  if (output.exitCode.value !== 0) {
    return Result.fail(`t3 theme show exited with code ${output.exitCode.value}.`);
  }
  const list = PUBLISHED_LIST.exec(output.stdout)?.groups?.["list"];
  if (typeof list !== "string") {
    return Result.fail('t3 theme show printed no "Published themes:" line.');
  }
  return Result.succeed(list.startsWith(NONE_PUBLISHED) ? [] : list.split(", "));
};

const outputLines = (output: ShowOutput) =>
  `${output.stdout}\n${output.stderr}`.split("\n").filter((line) => line.trim() !== "");

// T3 Code 0.1.10 logs the reason for each file it rejects to standard output, before the two
// summary lines.
const reasonLines = (output: ShowOutput) =>
  outputLines(output).filter((line) => !SUMMARY_LINE.test(line));

const warn = (warnings: readonly string[], printed: readonly string[]) =>
  Console.error(
    [
      ...warnings.map((warning) => `Warning: ${warning}`),
      ...(printed.length > 0 ? ["t3 theme show printed:"] : []),
      ...printed.map((line) => `${INDENT}${line}`),
    ].join("\n"),
  );

const warnUnchecked = (problem: string, printed: readonly string[]) =>
  warn([`couldn't check the install. ${problem}`], printed);

const reportShow = (output: ShowOutput, ids: readonly ThemeId[]) => {
  const published = publishedIds(output);
  if (Result.isFailure(published)) {
    return warnUnchecked(published.failure, outputLines(output));
  }
  const rejected = ids.filter((id) => !published.success.includes(id));
  if (rejected.length === 0) {
    return Console.log(`T3 Code lists ${ids.join(", ")} as published.`);
  }
  return warn(
    rejected.map((id) => `T3 Code didn't accept ${id}: t3 theme show doesn't list it.`),
    reasonLines(output),
  );
};

const checkInstall = (baseDir: string, ids: readonly ThemeId[]) =>
  showThemes(baseDir).pipe(
    Effect.flatMap((output) => reportShow(output, ids)),
    // Spawning reports a missing executable as NotFound.
    Effect.catch((error) =>
      Predicate.isTagged(error.reason, "NotFound")
        ? Console.log("Skipped the check: t3 isn't on the PATH.")
        : warnUnchecked(`Couldn't run t3: ${error.message}`, []),
    ),
  );

// Without `--base-dir`, `t3 theme set` selects the theme in the home it finds itself, which is the
// home the files went to.
const printSelectCommands = (ids: readonly ThemeId[], baseDir: Option.Option<string>) => {
  const flags = Option.match(baseDir, { onNone: () => [], onSome: (dir) => ["--base-dir", dir] });
  const command = (id: ThemeId) => CommandLine.display(["t3", "theme", "set", ...flags, id]);
  return Console.log(ids.map((id) => `To select ${id}, run: ${command(id)}`).join("\n"));
};

/**
 * Copies the committed files of the selected themes into `<base>/userdata/themes`, then runs
 * `t3 theme show --base-dir <base>` once. The check only prints: the files are copied by then.
 *
 * @param request - The themes, their folder, and the inputs that choose the T3 Code home.
 * @returns The paths written, in order.
 */
export const installThemes = Effect.fnUntraced(function* (request: InstallRequest) {
  const path = yield* Path.Path;
  const baseDir = yield* resolveBaseDir(request);
  const directory = path.join(baseDir, "userdata", "themes");
  const files = yield* readCommittedFiles(request.source, request.ids);
  const written = yield* publishFiles(directory, files);
  yield* Console.log(`Copied ${request.ids.join(", ")} into ${directory}.`);
  yield* checkInstall(baseDir, request.ids);
  yield* printSelectCommands(
    request.ids,
    Option.map(request.baseDir, () => baseDir),
  );
  return written;
});
