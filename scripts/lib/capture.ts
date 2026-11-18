// `pnpm previews:capture`: records a theme's README pictures from the demo while its CSS
// animations run in real time. Paused or seeked animations can show frames that running ones never
// do, so nothing here pauses, seeks, slows, or disables an animation: every picture is a
// screenshot of the page as it runs. The command owns its preview server, its browser, and its
// temporary folder, and closes all three before it writes the five files under previews/<id>/.

import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import {
  Clock,
  Console,
  Data,
  Deferred,
  Duration,
  Effect,
  Fiber,
  FileSystem,
  Path,
  Predicate,
  Stream,
} from "effect";
import { ChildProcess, type ChildProcessSpawner } from "effect/process";
import type { ThemeId } from "../../src/catalog.ts";
import { publishFiles, type ThemeFile } from "./artifacts.ts";
import { repositoryRoot, runSite, spawnSiteVite } from "./site.ts";

const HOST = "127.0.0.1";
const PORT = 4173;
const SITE_URL = `http://${HOST}:${PORT}/mp-t3-code-themes/`;
const SERVER_START_TIMEOUT = "30 seconds";
// How long the preview server or FFmpeg has to exit after SIGTERM before it gets SIGKILL.
const STOP_GRACE = "2 seconds";
const READY_TIMEOUT_MS = 30_000;

// One device pixel per CSS pixel, and frames are never scaled: the theme draws its art at three
// CSS pixels per art pixel, and a scale that isn't a whole number distorts it. Under the mock's
// 52-pixel header the conversation is 588 pixels tall, which shows the whole large moon.
const VIEWPORT = { width: 960, height: 640 } as const;

type DemoState = "resting" | "ready" | "working" | "waiting";

interface Screenshot {
  readonly state: DemoState;
  /** How long after its state starts the screenshot is taken. */
  readonly after: Duration.Input;
}

// Working waits for the first encounter.
const SCREENSHOTS: readonly Screenshot[] = [
  { state: "resting", after: "500 millis" },
  { state: "ready", after: "500 millis" },
  { state: "working", after: "8 seconds" },
  { state: "waiting", after: "500 millis" },
];

// The fire changes every 0.18 seconds and the paired image layers every 0.25 seconds. Ten frames
// a second show each change, and five would skip some.
const FRAMES_PER_SECOND = 10;
const MILLIS_PER_SECOND = 1000;
const FRAME_INTERVAL_MS = MILLIS_PER_SECOND / FRAMES_PER_SECOND;
// Half a frame interval: a frame that starts later could skip a sprite change, so the capture
// stops instead.
const LATENESS_TOLERANCE_MS = 50;
// The summary of a run counts the frames later than half the tolerance.
const NOTED_LATENESS_MS = 25;

interface Segment {
  readonly state: DemoState;
  readonly seconds: number;
}

// The GIF's states in order, with how long each lasts. Working lasts 24 seconds: the first
// encounter, the next monster's arrival, and the start of the dragon's crossing. A GIF over the
// size limit gets a shorter working segment, not a lower frame rate.
const GIF_SEGMENTS: readonly Segment[] = [
  { state: "resting", seconds: 2 },
  { state: "ready", seconds: 2 },
  { state: "working", seconds: 24 },
  { state: "waiting", seconds: 3 },
  { state: "resting", seconds: 1 },
];
const GIF_LIMIT_BYTES = 10_000_000;
const GIF_NAME = "preview.gif";
// One 256-colour palette for the whole GIF, no dithering, and each frame stores only the
// rectangle that changed.
const GIF_FILTER =
  "[0:v]split[a][b];[a]palettegen=max_colors=256:reserve_transparent=0:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle";
const FRAME_DIGITS = 4;
const FRAME_PATTERN = `frame-%0${FRAME_DIGITS}d.png`;
const MANIFEST_NAME = "manifest.json";
const JSON_INDENT = 2;
const NANOS_PER_MILLI = 1_000_000;

/** The demo's state at each frame of the GIF. */
const frameStates: readonly DemoState[] = GIF_SEGMENTS.flatMap(({ state, seconds }) =>
  Array.from({ length: seconds * FRAMES_PER_SECOND }, () => state),
);

const bytesFormat = new Intl.NumberFormat("en");

class MissingFfmpeg extends Data.TaggedError("MissingFfmpeg") {
  public override readonly message =
    "The capture encodes the GIF with FFmpeg, and ffmpeg isn't on the PATH. Install FFmpeg, then run the command again.";
}

class PreviewServerFailed extends Data.TaggedError("PreviewServerFailed")<{
  readonly problem: string;
  readonly output: readonly string[];
}> {
  public override get message(): string {
    // Vite's own message is enough; its stack trace isn't.
    const printed = this.output.filter((line) => line.trim() !== "" && !/^\s+at /u.test(line));
    return [
      `The preview server on ${HOST}:${PORT} didn't start. ${this.problem}`,
      "The capture serves the demo itself and never uses a server it didn't start, so the port must be free.",
      ...(printed.length > 0 ? ["vp preview printed:", ...printed.map((line) => `  ${line}`)] : []),
    ].join("\n");
  }
}

class BrowserFailed extends Data.TaggedError("BrowserFailed")<{
  readonly action: string;
  readonly cause: unknown;
}> {
  public override get message(): string {
    const reason = this.cause instanceof Error ? this.cause.message : String(this.cause);
    return `Couldn't ${this.action}: ${reason}`;
  }
}

class LateFrame extends Data.TaggedError("LateFrame")<{
  readonly frame: number;
  readonly lateness: number;
}> {
  public override get message(): string {
    return `Frame ${this.frame} started ${this.lateness.toFixed(1)} ms after its deadline, past the ${LATENESS_TOLERANCE_MS} ms tolerance, so the capture stopped. Nothing under previews/ changed. Give the machine less to do and capture again.`;
  }
}

class EncodeFailed extends Data.TaggedError("EncodeFailed")<{
  readonly exitCode: number;
  readonly output: string;
}> {
  public override get message(): string {
    return `FFmpeg exited with code ${this.exitCode} while it encoded the GIF:\n${this.output.trimEnd()}`;
  }
}

class GifTooLarge extends Data.TaggedError("GifTooLarge")<{ readonly bytes: number }> {
  public override get message(): string {
    return `${GIF_NAME} is ${bytesFormat.format(this.bytes)} bytes, over the limit of ${bytesFormat.format(GIF_LIMIT_BYTES)}. Nothing under previews/ changed. Shorten the working segment in GIF_SEGMENTS in scripts/lib/capture.ts.`;
  }
}

// Spawning reports a missing executable as NotFound. The check runs before the site build and the
// browser, so a missing FFmpeg costs nothing.
const requireFfmpeg = Effect.scoped(
  Effect.flatMap(
    ChildProcess.make("ffmpeg", ["-hide_banner", "-version"], {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
      forceKillAfter: STOP_GRACE,
    }),
    (ffmpeg) => ffmpeg.exitCode,
  ),
).pipe(
  Effect.catch((error) =>
    Effect.fail(Predicate.isTagged(error.reason, "NotFound") ? new MissingFfmpeg() : error),
  ),
);

const readServerOutput = (
  server: ChildProcessSpawner.ChildProcessHandle,
  output: string[],
  listening: Deferred.Deferred<string>,
) =>
  Stream.decodeText(server.all).pipe(
    Stream.splitLines,
    Stream.runForEach((line) => {
      output.push(line);
      return line.includes("Local:") && line.includes(SITE_URL)
        ? Deferred.succeed(listening, line)
        : Effect.void;
    }),
  );

// The server counts as started once the process this command spawned prints the demo's address,
// so no page comes from a server the command didn't start. If the process exits first, such as
// when another server holds the port, its output says why. Closing the scope stops it.
const startPreviewServer = Effect.gen(function* () {
  const args = ["preview", "--host", HOST, "--port", String(PORT), "--strictPort"];
  const server = yield* spawnSiteVite(args, { stdin: "ignore", forceKillAfter: STOP_GRACE });
  const output: string[] = [];
  const listening = yield* Deferred.make<string>();
  const reader = yield* Effect.forkScoped(readServerOutput(server, output, listening));
  const exited = Fiber.join(reader).pipe(
    Effect.andThen(server.exitCode),
    Effect.flatMap((code) =>
      Effect.fail(new PreviewServerFailed({ problem: `It exited with code ${code}.`, output })),
    ),
  );
  const timedOut = new PreviewServerFailed({
    problem: `It didn't print its address within ${SERVER_START_TIMEOUT}.`,
    output,
  });
  yield* Effect.raceFirst(Deferred.await(listening), exited).pipe(
    Effect.timeoutOrElse({ duration: SERVER_START_TIMEOUT, orElse: () => Effect.fail(timedOut) }),
  );
});

const usePlaywright = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({ try: run, catch: (cause) => new BrowserFailed({ action, cause }) });

// Something that won't close is left for a person to stop, so the warning names it.
const closeOrWarn = (what: string, close: () => Promise<void>) =>
  Effect.tryPromise(close).pipe(
    Effect.catch((error) => Effect.logWarning(`Couldn't close ${what}: ${error.message}`)),
  );

// The runtime turns Ctrl-C and SIGTERM into an interruption, which closes the browser through the
// scope. Playwright's own handlers would end the process before the scope removes the frames.
const launchBrowser = Effect.acquireRelease(
  usePlaywright("start Chromium", () =>
    chromium.launch({ handleSIGINT: false, handleSIGTERM: false }),
  ),
  (browser) => closeOrWarn("Chromium", () => browser.close()),
);

// Motion stays on. Reduced motion has a browser test of its own.
const openContext = (browser: Browser) =>
  Effect.acquireRelease(
    usePlaywright("open a browser context", () =>
      browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
        reducedMotion: "no-preference",
      }),
    ),
    (context) => closeOrWarn("the browser context", () => context.close()),
  );

// The demo marks <html> once the theme and its decoded background are applied. The fonts and two
// animation frames after that mean the first picture shows the page as painted. The page code is
// text because the scripts' TypeScript project has no DOM library.
const settle = async (page: Page): Promise<void> => {
  await page.waitForSelector('html[data-demo-ready="true"]', {
    state: "attached",
    timeout: READY_TIMEOUT_MS,
  });
  await page.evaluate("document.fonts.ready.then(() => undefined)");
  await page.evaluate(
    "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
  );
};

// capture=1 hides the page's controls and gives the made-up window the whole viewport.
const openDemo = Effect.fnUntraced(function* (context: BrowserContext, id: ThemeId) {
  const page = yield* Effect.acquireRelease(
    usePlaywright("open a page", () => context.newPage()),
    (opened) => closeOrWarn("a page", () => opened.close()),
  );
  const query = new URLSearchParams({ theme: id, capture: "1" });
  yield* usePlaywright("load the demo", () => page.goto(`${SITE_URL}?${query.toString()}`));
  yield* usePlaywright("wait for the demo to apply the theme", () => settle(page));
  return page;
});

// capture=1 hides the state buttons, and Playwright's click() refuses a hidden element. The
// dispatched click runs the buttons' own handler, which changes the real markers and focus. The
// demo opens at rest, and choosing the current state again changes nothing.
const enterState = (page: Page, state: DemoState) =>
  usePlaywright(`switch the demo to ${state}`, () =>
    page.locator(`[data-demo-state="${state}"]`).dispatchEvent("click"),
  );

const screenshot = (page: Page) =>
  usePlaywright("take a screenshot", () =>
    page.screenshot({ type: "png", animations: "allow", caret: "hide" }),
  );

// Each screenshot has a page of its own, so its state's animations start at a known moment.
const captureState = (context: BrowserContext, id: ThemeId, shot: Screenshot) =>
  Effect.scoped(
    Effect.gen(function* () {
      const page = yield* openDemo(context, id);
      yield* enterState(page, shot.state);
      yield* Effect.sleep(shot.after);
      const bytes = yield* screenshot(page);
      return { name: `${shot.state}.png`, bytes } satisfies ThemeFile;
    }),
  );

interface FrameRecord {
  readonly frame: number;
  readonly state: DemoState;
  /** Milliseconds after the first frame's deadline, as are the two below. */
  readonly deadline: number;
  readonly started: number;
  readonly lateness: number;
}

interface Sampler {
  readonly page: Page;
  readonly directory: string;
  /** The monotonic time of the first frame's deadline, in nanoseconds. */
  readonly start: bigint;
}

const elapsedMillis = (start: bigint) =>
  Effect.map(Clock.monotonicTimeNanos, (now) => Number(now - start) / NANOS_PER_MILLI);

const frameName = (frame: number) => `frame-${String(frame).padStart(FRAME_DIGITS, "0")}.png`;

const sleepUntil = (start: bigint, deadline: number) =>
  Effect.flatMap(elapsedMillis(start), (elapsed) =>
    Effect.sleep(Duration.millis(Math.max(0, deadline - elapsed))),
  );

const saveFrame = Effect.fnUntraced(function* (sampler: Sampler, frame: number) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const bytes = yield* screenshot(sampler.page);
  yield* fs.writeFile(path.join(sampler.directory, frameName(frame)), bytes);
});

// Every deadline counts from the first frame, so a late frame doesn't push back the ones after
// it. A state starts at the deadline of its first frame.
const sampleFrame = Effect.fnUntraced(function* (
  sampler: Sampler,
  state: DemoState,
  frame: number,
) {
  const deadline = frame * FRAME_INTERVAL_MS;
  yield* sleepUntil(sampler.start, deadline);
  if (frame > 0 && frameStates[frame - 1] !== state) {
    yield* enterState(sampler.page, state);
  }
  const started = yield* elapsedMillis(sampler.start);
  const lateness = started - deadline;
  if (lateness > LATENESS_TOLERANCE_MS) {
    return yield* new LateFrame({ frame, lateness });
  }
  yield* saveFrame(sampler, frame);
  return { frame, state, deadline, started, lateness } satisfies FrameRecord;
});

const describeLateness = (records: readonly FrameRecord[]) => {
  const latest = records.reduce((worst, record) =>
    record.lateness > worst.lateness ? record : worst,
  );
  const noted = records.filter((record) => record.lateness > NOTED_LATENESS_MS).length;
  return `Sampled ${records.length} frames ${FRAME_INTERVAL_MS} ms apart. The latest, frame ${latest.frame}, started ${latest.lateness.toFixed(1)} ms after its deadline, and ${noted} started more than ${NOTED_LATENESS_MS} ms late.`;
};

// The manifest records when each frame really started. It stays in the temporary folder.
const sampleFrames = (context: BrowserContext, id: ThemeId, directory: string) =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const page = yield* openDemo(context, id);
      const start = yield* Clock.monotonicTimeNanos;
      const records = yield* Effect.forEach(frameStates, (state, frame) =>
        sampleFrame({ page, directory, start }, state, frame),
      );
      const manifest = { intervalMs: FRAME_INTERVAL_MS, frames: records };
      yield* fs.writeFileString(
        path.join(directory, MANIFEST_NAME),
        JSON.stringify(manifest, null, JSON_INDENT),
      );
      yield* Console.log(describeLateness(records));
    }),
  );

// The server and the browser live only as long as the recording, and the GIF is encoded after
// both have stopped.
const recordInBrowser = Effect.fnUntraced(function* (id: ThemeId, directory: string) {
  yield* startPreviewServer;
  const context = yield* openContext(yield* launchBrowser);
  yield* Console.log(`Capturing ${SCREENSHOTS.length} state screenshots.`);
  const screenshots = yield* Effect.forEach(SCREENSHOTS, (shot) => captureState(context, id, shot));
  const seconds = frameStates.length / FRAMES_PER_SECOND;
  yield* Console.log(
    `Sampling ${frameStates.length} frames for ${GIF_NAME} over ${seconds} seconds.`,
  );
  yield* sampleFrames(context, id, directory);
  return screenshots;
});

const encodeGif = Effect.fnUntraced(function* (directory: string) {
  const path = yield* Path.Path;
  const gif = path.join(directory, GIF_NAME);
  const ffmpeg = yield* ChildProcess.make(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-framerate",
      String(FRAMES_PER_SECOND),
      "-i",
      path.join(directory, FRAME_PATTERN),
      "-filter_complex",
      GIF_FILTER,
      "-loop",
      "0",
      gif,
    ],
    { stdin: "ignore", forceKillAfter: STOP_GRACE },
  );
  const [output, exitCode] = yield* Effect.all(
    [Stream.mkString(Stream.decodeText(ffmpeg.all)), ffmpeg.exitCode],
    { concurrency: "unbounded" },
  );
  if (exitCode !== 0) {
    return yield* new EncodeFailed({ exitCode, output });
  }
  return gif;
});

const readGif = Effect.fnUntraced(function* (gif: string) {
  const fs = yield* FileSystem.FileSystem;
  const bytes = yield* fs.readFile(gif);
  if (bytes.length > GIF_LIMIT_BYTES) {
    return yield* new GifTooLarge({ bytes: bytes.length });
  }
  yield* Console.log(`Encoded ${GIF_NAME}: ${bytesFormat.format(bytes.length)} bytes.`);
  return bytes;
});

// The temporary folder holds the frames, the manifest, and the GIF until the five files are read.
const record = Effect.fnUntraced(function* (id: ThemeId) {
  const fs = yield* FileSystem.FileSystem;
  const directory = yield* fs.makeTempDirectoryScoped({ prefix: "mp-t3-capture-" });
  const screenshots = yield* Effect.scoped(recordInBrowser(id, directory));
  const gif = yield* readGif(yield* encodeGif(directory));
  return [...screenshots, { name: GIF_NAME, bytes: gif }];
});

/**
 * Builds the demo, serves it on 127.0.0.1:4173, and records a theme's previews from running
 * animations: a screenshot of each state and a looping GIF. The files in previews/<id>/ are
 * replaced only after all five have been recorded, each through a temporary name and a rename.
 *
 * @param id - The theme to capture.
 * @returns The paths written, relative to the repository root.
 */
export const capturePreviews = Effect.fnUntraced(function* (id: ThemeId) {
  const path = yield* Path.Path;
  yield* requireFfmpeg;
  yield* runSite("build");
  const files = yield* Effect.scoped(record(id));
  const root = yield* repositoryRoot;
  const written = yield* publishFiles(path.join(root, "previews", id), files);
  const relative = written.map((file) => path.relative(root, file));
  yield* Console.log(`Wrote ${relative.join(", ")}.`);
  return relative;
});
