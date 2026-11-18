import { Data, Effect } from "effect";
import { catalog, isThemeId, type ThemeId } from "../../src/catalog.ts";
import { buildSavePoint } from "../../src/save-point/index.ts";
import type { BuiltTheme } from "../../src/theme-contract.ts";

// TypeScript rejects a catalog entry without a builder.
const builders: { readonly [Id in ThemeId]: () => BuiltTheme } = {
  "save-point": buildSavePoint,
};

/** Every catalogued theme, in catalog order. */
export const themeIds: readonly ThemeId[] = Object.keys(catalog).filter(isThemeId);

/** A builder threw, which means its artwork or rendering input is invalid. */
export class ThemeBuildError extends Data.TaggedError("ThemeBuildError")<{
  readonly id: ThemeId;
  readonly cause: unknown;
}> {
  public override get message(): string {
    const reason = this.cause instanceof Error ? this.cause.message : String(this.cause);
    return `Couldn't build ${this.id}: ${reason}`;
  }
}

/**
 * Runs the builders of the selected themes, in order.
 *
 * @param ids - The themes to build. Defaults to every catalogued theme.
 * @returns The built themes, in memory.
 */
export const buildThemes = (
  ids: readonly ThemeId[] = themeIds,
): Effect.Effect<BuiltTheme[], ThemeBuildError> =>
  Effect.forEach(ids, (id) =>
    Effect.try({ try: builders[id], catch: (cause) => new ThemeBuildError({ id, cause }) }),
  );
