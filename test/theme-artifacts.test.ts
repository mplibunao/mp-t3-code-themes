// These tests run the renderer under Node, whose zlib can compress the PNG into other bytes than
// Bun's. They compare builds with each other and with files they wrote themselves, never with the
// committed files in themes/. `pnpm themes:check` makes that comparison under the pinned Bun.

import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Layer, Path, PlatformError, type Scope } from "effect";
import { describe, expect, it } from "vite-plus/test";
import { checkThemes, renderThemeFiles, writeThemes } from "../scripts/lib/artifacts.ts";
import { buildThemes } from "../scripts/lib/build-themes.ts";

type Services = FileSystem.FileSystem | Path.Path | Scope.Scope;

const run = <A, E>(effect: Effect.Effect<A, E, Services>) =>
  Effect.runPromise(effect.pipe(Effect.scoped, Effect.provide(NodeServices.layer)));

// A folder that holds freshly built theme files.
const publishedFolder = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const directory = yield* fs.makeTempDirectoryScoped();
  const themes = yield* buildThemes();
  yield* writeThemes(directory, themes);
  return { directory, themes };
});

// The real file system, except that every rename fails.
const renameFails = Layer.effect(
  FileSystem.FileSystem,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return {
      ...fs,
      rename: (from: string) =>
        Effect.fail(
          PlatformError.systemError({
            _tag: "PermissionDenied",
            module: "FileSystem",
            method: "rename",
            pathOrDescriptor: from,
          }),
        ),
    };
  }),
).pipe(Layer.provide(NodeServices.layer));

// A way a committed file goes stale, and how the check must report it.
interface StaleEdit {
  readonly edit: string;
  /** The stale bytes, or null to delete the file. */
  readonly apply: (bytes: Uint8Array) => Uint8Array | null;
  readonly state: "missing" | "differing";
}

const staleEdits: readonly StaleEdit[] = [
  {
    edit: "one byte changes",
    apply: (bytes) => bytes.map((byte, index) => (index === 100 ? (byte + 1) % 256 : byte)),
    state: "differing",
  },
  { edit: "the last byte goes", apply: (bytes) => bytes.slice(0, -1), state: "differing" },
  { edit: "the file goes", apply: () => null, state: "missing" },
];

const staleCases = ["save-point.png", "save-point.json"].flatMap((name) =>
  staleEdits.map((stale) => ({ name, ...stale })),
);

describe("theme files", () => {
  it("are the same on every build", async () => {
    const [first, second] = await Effect.runPromise(Effect.all([buildThemes(), buildThemes()]));
    // Each build owns its palette, so changing one result can't change a later build.
    for (const [index, theme] of first.entries()) {
      expect(second[index]?.document.colors).not.toBe(theme.document.colors);
    }

    const [firstFiles, secondFiles] = await Effect.runPromise(
      Effect.all([renderThemeFiles(first), renderThemeFiles(second)]),
    );
    expect(secondFiles).toStrictEqual(firstFiles);
  });

  it.each(staleCases)("fail the check when $edit in $name, and leave it that way", (stale) =>
    run(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const { directory, themes } = yield* publishedFolder;
        yield* checkThemes(directory, themes);

        const file = path.join(directory, stale.name);
        const bytes = stale.apply(yield* fs.readFile(file));
        yield* bytes === null ? fs.remove(file) : fs.writeFile(file, bytes);

        const result = yield* Effect.result(checkThemes(directory, themes));
        expect(result).toMatchObject({
          _tag: "Failure",
          failure: {
            _tag: "StaleThemeFiles",
            missing: stale.state === "missing" ? [file] : [],
            differing: stale.state === "differing" ? [file] : [],
          },
        });
        const after = (yield* fs.exists(file)) ? yield* fs.readFile(file) : null;
        expect(after).toStrictEqual(bytes);
      }),
    ),
  );

  it("keep their previous contents whole when a rename fails", () =>
    run(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const directory = yield* fs.makeTempDirectoryScoped();
        const names = ["save-point.json", "save-point.png"];
        for (const name of names) {
          yield* fs.writeFileString(path.join(directory, name), "previous");
        }

        const themes = yield* buildThemes();
        const result = yield* Effect.result(
          writeThemes(directory, themes).pipe(Effect.provide(renameFails)),
        );
        expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "PublishError" } });

        expect(new Set(yield* fs.readDirectory(directory))).toStrictEqual(new Set(names));
        for (const name of names) {
          expect(yield* fs.readFileString(path.join(directory, name))).toBe("previous");
        }
      }),
    ));
});
