// The installer with `t3` substituted through Effect's process service. These tests prove what
// the installer does with each response, not that T3 Code gives it.

import { NodeServices } from "@effect/platform-node";
import {
  Console,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  PlatformError,
  Sink,
  Stream,
  type Scope,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { describe, expect, it } from "vite-plus/test";
import { installThemes } from "../scripts/lib/install.ts";

type Services = FileSystem.FileSystem | Path.Path | Scope.Scope;

const committed = { "save-point.json": '{ "name": "Save Point" }\n', "save-point.png": "png" };

// What T3 Code 0.1.10 prints for a rejected file: the reason goes to standard output, before the
// summary lines.
const rejectedOutput = (
  themes: string,
) => `[19:24:29.965] WARN (#2): ignoring invalid environment theme {
  path: '${themes}/save-point.json',
  detail: 'SchemaError: Missing key\\n  at ["appearance"]'
}
Environment theme: not set.

Published themes: none (publish into ${themes}).

`;

const listedOutput = "Environment theme: not set.\n\nPublished themes: save-point.\n\n";

const finished = (stdout: string) => {
  const bytes = Stream.make(new TextEncoder().encode(stdout));
  return ChildProcessSpawner.makeHandle({
    pid: ChildProcessSpawner.ProcessId(1),
    exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
    isRunning: Effect.succeed(false),
    kill: () => Effect.void,
    stdin: Sink.drain,
    stdout: bytes,
    stderr: Stream.empty,
    all: bytes,
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty,
    unref: Effect.succeed(Effect.void),
  });
};

// A `t3` that exits 0 after printing the output for the folder it's given, and records its
// arguments.
const t3Prints = (output: (themes: string) => string, calls: string[][]) =>
  Layer.succeed(ChildProcessSpawner.ChildProcessSpawner)(
    ChildProcessSpawner.make((command) => {
      const args = ChildProcess.isStandardCommand(command) ? command.args.map(String) : [];
      calls.push(args);
      return Effect.succeed(finished(output(`${args.at(-1)}/userdata/themes`)));
    }),
  );

const t3Missing = Layer.succeed(ChildProcessSpawner.ChildProcessSpawner)(
  ChildProcessSpawner.make(() =>
    Effect.fail(
      PlatformError.systemError({
        _tag: "NotFound",
        module: "ChildProcess",
        method: "spawn",
        pathOrDescriptor: "t3",
      }),
    ),
  ),
);

const captureConsole = () => {
  const printed = { log: [] as string[], error: [] as string[] };
  const console: Console.Console = {
    ...globalThis.console,
    log: (...args: unknown[]) => printed.log.push(args.join(" ")),
    error: (...args: unknown[]) => printed.error.push(args.join(" ")),
  };
  return { printed, console };
};

const run = <A, E>(
  effect: Effect.Effect<A, E, Services | ChildProcessSpawner.ChildProcessSpawner>,
  t3: Layer.Layer<ChildProcessSpawner.ChildProcessSpawner>,
) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(t3), Effect.scoped, Effect.provide(NodeServices.layer)),
  );

// A temporary folder holding the committed files under `source/`.
const workspace = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fs.makeTempDirectoryScoped();
  const source = path.join(root, "source");
  yield* fs.makeDirectory(source);
  for (const [name, content] of Object.entries(committed)) {
    yield* fs.writeFileString(path.join(source, name), content);
  }
  return { root, source, join: (...parts: string[]) => path.join(root, ...parts) };
});

describe("themes:install", () => {
  it.each([
    { chosen: "flag", baseDir: Option.some("flag"), t3Home: Option.some("env") },
    { chosen: "env", baseDir: Option.none<string>(), t3Home: Option.some("env") },
    { chosen: "home/.t3", baseDir: Option.none<string>(), t3Home: Option.some(" ") },
  ])("copies into $chosen and checks that folder", ({ chosen, baseDir, t3Home }) => {
    const calls: string[][] = [];
    const { console } = captureConsole();
    return run(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const { root, source, join } = yield* workspace;
        yield* installThemes({
          ids: ["save-point"],
          source,
          baseDir: Option.map(baseDir, (name) => join(name)),
          t3Home: Option.map(t3Home, (name) => (name.trim() === "" ? name : join(name))),
          home: join("home"),
        }).pipe(Effect.provideService(Console.Console, console));

        const themes = `${chosen}/userdata/themes`;
        const outsideSource = (yield* fs.readDirectory(root, { recursive: true })).filter(
          (entry) => !entry.startsWith("source"),
        );
        expect(new Set(outsideSource.filter((entry) => entry.startsWith(themes)))).toStrictEqual(
          new Set([themes, `${themes}/save-point.json`, `${themes}/save-point.png`]),
        );
        expect(outsideSource.filter((entry) => /\.(?:json|png)$/u.test(entry))).toHaveLength(2);
        expect(yield* fs.readFileString(join(themes, "save-point.json"))).toBe(
          committed["save-point.json"],
        );
        expect(calls).toStrictEqual([["theme", "show", "--base-dir", join(chosen)]]);
      }),
      t3Prints(() => listedOutput, calls),
    );
  });

  it("warns that T3 Code didn't accept a theme t3 doesn't list, and repeats t3's reason", () => {
    const { printed, console } = captureConsole();
    return run(
      Effect.gen(function* () {
        const { source, join } = yield* workspace;
        yield* installThemes({
          ids: ["save-point"],
          source,
          baseDir: Option.some(join("t3")),
          t3Home: Option.none(),
          home: join("home"),
        }).pipe(Effect.provideService(Console.Console, console));

        const warning = printed.error.join("\n");
        expect(warning).toMatch(/didn't accept save-point/u);
        expect(warning).toContain(`detail: 'SchemaError: Missing key\\n  at ["appearance"]'`);
        expect(printed.log.join("\n")).not.toMatch(/as published/u);
      }),
      t3Prints(rejectedOutput, []),
    );
  });

  it("copies the files and says the check was skipped when t3 isn't on the PATH", () => {
    const { printed, console } = captureConsole();
    return run(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const { source, join } = yield* workspace;
        const written = yield* installThemes({
          ids: ["save-point"],
          source,
          baseDir: Option.some(join("t3")),
          t3Home: Option.none(),
          home: join("home"),
        }).pipe(Effect.provideService(Console.Console, console));

        expect(written).toHaveLength(2);
        for (const file of written) {
          expect(yield* fs.exists(file)).toBe(true);
        }
        expect(printed.log.join("\n")).toMatch(/Skipped the check: t3 isn't on the PATH/u);
        expect(printed.error).toStrictEqual([]);
      }),
      t3Missing,
    );
  });
});
