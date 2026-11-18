// The files in themes/: serialization, validation, comparison with the committed files,
// publishing, and copies of the committed files for the installer and the site. T3 Code publishes
// a theme as soon as a `.json` name appears in its folder and reads the image beside it, so every
// file is written under a temporary name and renamed into place, the image before its JSON.

import { Data, Effect, Exit, FileSystem, Path, type Schema } from "effect";
import type { PlatformError } from "effect/PlatformError";
import { catalog, type ThemeId } from "../../src/catalog.ts";
import {
  validateBuiltTheme,
  type BuiltTheme,
  type ThemeDocument,
} from "../../src/theme-contract.ts";

const JSON_INDENT = 2;

/** One file of a built theme: its name in the themes folder and its bytes. */
export interface ThemeFile {
  readonly name: string;
  readonly bytes: Uint8Array;
}

export class InvalidTheme extends Data.TaggedError("InvalidTheme")<{
  readonly id: string;
  readonly cause: Schema.SchemaError;
}> {
  public override get message(): string {
    return `${this.id} breaks the theme file contract:\n${this.cause.message}`;
  }
}

/** The committed files that differ from the build. The check never changes them. */
export class StaleThemeFiles extends Data.TaggedError("StaleThemeFiles")<{
  readonly missing: readonly string[];
  readonly differing: readonly string[];
}> {
  public override get message(): string {
    const lines = [
      ...this.missing.map((path) => `${path} is missing.`),
      ...this.differing.map((path) => `${path} differs from the build.`),
    ];
    return `${lines.join("\n")}\nRun pnpm themes:build and commit the result.`;
  }
}

/** Committed theme files that aren't there. */
export class MissingThemeFiles extends Data.TaggedError("MissingThemeFiles")<{
  readonly paths: readonly string[];
}> {
  public override get message(): string {
    const lines = this.paths.map((path) => `${path} is missing.`);
    return `${lines.join("\n")}\nRun pnpm themes:build first.`;
  }
}

/** A write or rename failed. The files listed in `published` were already replaced. */
export class PublishError extends Data.TaggedError("PublishError")<{
  readonly path: string;
  readonly published: readonly string[];
  readonly cause: PlatformError;
}> {
  public override get message(): string {
    const replaced =
      this.published.length > 0 ? ` Already replaced: ${this.published.join(", ")}.` : "";
    return `Couldn't write ${this.path}: ${this.cause.message}.${replaced}`;
  }
}

const serializeDocument = (document: ThemeDocument) =>
  new TextEncoder().encode(`${JSON.stringify(document, null, JSON_INDENT)}\n`);

// The contract has already checked that the catalog lists a background exactly when the build
// made one.
const backgroundFiles = (theme: BuiltTheme): ThemeFile[] => {
  const entry: { readonly background?: string } = catalog[theme.id];
  return theme.background && entry.background
    ? [{ name: `${theme.id}.${entry.background}`, bytes: theme.background }]
    : [];
};

const themeFiles = (theme: BuiltTheme) =>
  validateBuiltTheme(theme).pipe(
    Effect.mapError((cause) => new InvalidTheme({ id: theme.id, cause })),
    Effect.map((valid) => [
      ...backgroundFiles(valid),
      { name: `${valid.id}.json`, bytes: serializeDocument(valid.document) },
    ]),
  );

/**
 * Validates every theme before anything is written.
 *
 * @param themes - Built themes.
 * @returns Each theme's files in publishing order: the background, then the JSON.
 */
export const renderThemeFiles = (
  themes: readonly BuiltTheme[],
): Effect.Effect<ThemeFile[], InvalidTheme> =>
  Effect.forEach(themes, themeFiles).pipe(Effect.map((files) => files.flat()));

// A temporary file that can't be removed stays behind, so the warning names it for a person to
// delete.
const removeTemporary = (fs: FileSystem.FileSystem, temporary: string) =>
  fs
    .remove(temporary)
    .pipe(
      Effect.catch((error) => Effect.logWarning(`Couldn't remove ${temporary}: ${error.message}`)),
    );

const publishFile = Effect.fnUntraced(function* (target: string, bytes: Uint8Array) {
  const fs = yield* FileSystem.FileSystem;
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  yield* Effect.acquireUseRelease(
    // Creating the file exclusively before filling it means the cleanup below only ever removes a
    // file this call created.
    fs.writeFile(temporary, new Uint8Array(), { flag: "wx" }),
    () => Effect.andThen(fs.writeFile(temporary, bytes), fs.rename(temporary, target)),
    (_, exit) => (Exit.isSuccess(exit) ? Effect.void : removeTemporary(fs, temporary)),
  );
});

/**
 * Writes files into `directory` in the given order, each atomically. A failure stops the rest and
 * names the files already replaced.
 *
 * @param directory - The themes folder. Created if it's missing.
 * @param files - Files in publishing order: each background before its JSON.
 * @returns The paths written, in order.
 */
export const publishFiles = Effect.fnUntraced(function* (
  directory: string,
  files: readonly ThemeFile[],
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* fs.makeDirectory(directory, { recursive: true });
  const published: string[] = [];
  for (const file of files) {
    const target = path.join(directory, file.name);
    yield* publishFile(target, file.bytes).pipe(
      Effect.mapError(
        (cause) => new PublishError({ path: target, published: [...published], cause }),
      ),
    );
    published.push(target);
  }
  return published;
});

/**
 * Validates and writes the themes' files into `directory`. Each file is replaced atomically; the
 * pair isn't, so a failure can leave a new image beside the previous JSON.
 *
 * @param directory - The themes folder. Created if it's missing.
 * @param themes - Built themes.
 * @returns The paths written, in order.
 */
export const writeThemes = (
  directory: string,
  themes: readonly BuiltTheme[],
): Effect.Effect<
  string[],
  InvalidTheme | PublishError | PlatformError,
  FileSystem.FileSystem | Path.Path
> => renderThemeFiles(themes).pipe(Effect.flatMap((files) => publishFiles(directory, files)));

// The image comes before its JSON: T3 Code publishes a theme as soon as the JSON appears.
const committedNames = (id: ThemeId): string[] => {
  const { background }: { readonly background?: string } = catalog[id];
  return background ? [`${id}.${background}`, `${id}.json`] : [`${id}.json`];
};

/**
 * Reads the committed files of the selected themes. Reads nothing when one of them is missing.
 *
 * @param source - The folder that holds the committed theme files.
 * @param ids - Catalogued ids, each once.
 * @returns Each theme's files in publishing order: the background, then the JSON.
 */
export const readCommittedFiles = Effect.fnUntraced(function* (
  source: string,
  ids: readonly ThemeId[],
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const paths = ids.flatMap(committedNames).map((name) => path.join(source, name));
  const present = yield* Effect.forEach(paths, (file) => fs.exists(file));
  const missing = paths.filter((_, index) => present[index] !== true);
  if (missing.length > 0) {
    return yield* new MissingThemeFiles({ paths: missing });
  }
  return yield* Effect.forEach(paths, (file) =>
    Effect.map(fs.readFile(file), (bytes): ThemeFile => ({ name: path.basename(file), bytes })),
  );
});

/**
 * Replaces `destination` with the committed files of the selected themes, for the site build. The
 * folder is emptied first, so the site serves no file of a theme that left the catalog.
 *
 * @param source - The folder that holds the committed theme files.
 * @param destination - The site's themes folder, which the build copies into its output.
 * @param ids - Catalogued ids, each once.
 * @returns The paths written, in order.
 */
export const copyCommittedThemes = Effect.fnUntraced(function* (
  source: string,
  destination: string,
  ids: readonly ThemeId[],
) {
  const fs = yield* FileSystem.FileSystem;
  const files = yield* readCommittedFiles(source, ids);
  yield* fs.remove(destination, { recursive: true, force: true });
  return yield* publishFiles(destination, files);
});

const sameBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((byte, index) => byte === b[index]);

const compareFile = Effect.fnUntraced(function* (target: string, bytes: Uint8Array) {
  const fs = yield* FileSystem.FileSystem;
  if (!(yield* fs.exists(target))) {
    return { target, state: "missing" } as const;
  }
  const same = sameBytes(yield* fs.readFile(target), bytes);
  return { target, state: same ? "same" : "differing" } as const;
});

const checkFiles = Effect.fnUntraced(function* (directory: string, files: readonly ThemeFile[]) {
  const path = yield* Path.Path;
  const results = yield* Effect.forEach(files, (file) =>
    compareFile(path.join(directory, file.name), file.bytes),
  );
  const withState = (state: string) =>
    results.filter((result) => result.state === state).map((result) => result.target);
  const missing = withState("missing");
  const differing = withState("differing");
  if (missing.length > 0 || differing.length > 0) {
    return yield* new StaleThemeFiles({ missing, differing });
  }
  return results.map((result) => result.target);
});

/**
 * Compares the themes' files with those in `directory`, byte for byte. Never writes.
 *
 * @param directory - The themes folder.
 * @param themes - Built themes.
 * @returns The paths compared.
 */
export const checkThemes = (
  directory: string,
  themes: readonly BuiltTheme[],
): Effect.Effect<
  string[],
  InvalidTheme | StaleThemeFiles | PlatformError,
  FileSystem.FileSystem | Path.Path
> => renderThemeFiles(themes).pipe(Effect.flatMap((files) => checkFiles(directory, files)));
