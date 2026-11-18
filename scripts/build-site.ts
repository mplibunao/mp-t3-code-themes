// Entry point of `pnpm build`: copies the committed theme files into .site-public/themes/, then
// builds the demo into dist/. Runs under Bun and supplies the Bun-backed services.

import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import { runSite } from "./lib/site.ts";

BunRuntime.runMain(runSite("build").pipe(Effect.provide(BunServices.layer)));
