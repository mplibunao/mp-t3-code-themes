// The failure every entry point ends with once it has printed an error, so each error is printed
// once and the runtime only sets the exit code.

import { Console, Data, Effect, Runtime } from "effect";

/** The message is already on the terminal, so the runtime only sets the exit code. */
export class Reported extends Data.TaggedError("Reported")<{ readonly exitCode: number }> {
  public override readonly [Runtime.errorReported] = false;

  public override get [Runtime.errorExitCode](): number {
    return this.exitCode;
  }
}

/**
 * Prints an error's message once, then fails with `Reported`. An error that is already `Reported`
 * has been printed, so it passes through unchanged.
 *
 * @param error - The failure to report.
 * @param exitCode - The exit code for an error that isn't `Reported` yet.
 * @returns An effect that always fails with `Reported`.
 */
export const reportFailure = (
  error: { readonly message: string },
  exitCode: number,
): Effect.Effect<never, Reported> =>
  error instanceof Reported
    ? Effect.fail(error)
    : Console.error(error.message).pipe(Effect.andThen(Effect.fail(new Reported({ exitCode }))));
