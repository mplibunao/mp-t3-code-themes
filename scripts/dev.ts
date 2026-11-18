// Entry point of `pnpm dev`: copies the committed theme files into .site-public/themes/ once, then
// runs the demo's dev server until it's stopped. Runs under Bun and supplies the Bun-backed
// services.

import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import { runSite } from "./lib/site.ts";

BunRuntime.runMain(runSite("dev").pipe(Effect.provide(BunServices.layer)));
