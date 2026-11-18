# 001: Repository shape

Decided on 2026-11-18, when the repository was created.

This record covers how the repository is laid out, what its theme files promise, how close the demo stays to T3 Code, and where the repository departs from my usual defaults. [`CLAUDE.md`](../../CLAUDE.md) and the [README](../../README.md) describe how to work in it.

## One package

The repository is one private pnpm package, and nothing is published to npm. The code is split into folders by where it runs:

| Folder                 | What it holds and where it runs                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/`                 | The catalog, the theme file contract, and each theme's renderer. A renderer builds the files in memory and doesn't touch the file system. |
| `scripts/`             | The build, check, install, demo build, and capture commands, which run under Bun and use Effect.                                          |
| `site/`                | The demo page, in the browser.                                                                                                            |
| `test/`, `e2e/`        | Vitest tests under Node, and Playwright tests against the built demo.                                                                     |
| `themes/`, `previews/` | Generated files that are committed: the theme files and their pictures.                                                                   |

The parts share one catalog and one contract, and nothing outside this repository imports them. Separate packages would add exports and build steps without anyone to use them. The folders still keep the runtimes apart.

## Dependency directions

Imports go one way. The scripts and the site import from `src/`, never the reverse, and the site imports only the catalog. The table in [`CLAUDE.md`](../../CLAUDE.md#dependency-directions) defines the rules, Oxlint enforces them folder by folder, and `test/boundaries.test.ts` replays them through the lint configuration.

The renderer doesn't call file-system, process, or browser APIs, which lets the same build run under Bun for the committed files and under Node for the tests. The site runs in the browser and doesn't use Node, Bun, or Effect.

## The theme file contract

A generated theme file has a `name`, an `appearance`, hexadecimal `canvas` and `accent` colours, and a hexadecimal colour for each of the 61 colour roles of T3 Code 0.1.10, with none missing and none extra. It may have `css` that stays within the length limit below and has no backslash. It has no `id`, `version`, or `variants`. Its id follows T3 Code's rules and isn't one that T3 Code reserves, and the catalog and the build agree on whether it has a background image. `validateBuiltTheme` in `src/theme-contract.ts` checks all of this before any file is written. Effect Schema is the only definition of these rules and of the type.

- A complete palette means T3 Code never derives a colour. The demo can then apply the colours as they are instead of copying T3 Code's palette code.
- The contract describes what this repository generates, not every file T3 Code accepts, so it's narrower than T3 Code's own schema.
- The limit on the length of `css` follows the oldest T3 Code release I support, so that every theme loads there, even though later builds accept more. The [Compatibility section of the README](../../README.md#compatibility) gives the current release and character limit.
- T3 Code's CSS sanitizer drops every declaration whose value contains a backslash, so a backslash would break part of a theme without an error.
- T3 Code takes the id from the file name. Without `id` and `version`, Save Point's file stays byte for byte the one that ran in T3 Code.

## Committed theme files

`themes/` contains the built files and is committed, because the README's download links and the installer read from it. `pnpm themes:check` builds in memory and compares the result with the committed files byte for byte, and the gate runs it.

The PNG is compressed with `node:zlib`, and another zlib build can compress the same pixels into other bytes. Bun is pinned to 1.4.4 because it reproduces the PNG that ran in T3 Code. For the same reason, the installer and the demo build copy the committed files instead of building them, and no Vitest test compares a build with the committed files, because Vitest runs under Node. The mutation lane, `pnpm test:mutation`, runs those tests, so it doesn't notice a renderer mutation that changes the output the same way on every build. `pnpm themes:check` catches it.

## How close the demo stays to T3 Code

The demo copies what the theme's selectors need from T3 Code 0.1.10.

- The markup the theme hooks into: the conversation and composer areas side by side, `.dark` on `<html>`, the composer form with its question drawer and main surface, the labels of the run button, the live timeline rows, and the `composer-surface` container.
- The geometry. The header is 52 pixels tall, and the sidebar is 220 pixels wide and hides below 640 pixels. The chat is 46 rem or 72 rem wide, or the full width, and the composer overlaps the bottom of the conversation.
- The layers next to the stage. The composer's glass has 80% opacity and a 16-pixel blur, and it hands off to the drawer while a drawer is open. The question drawer is inset 22 pixels and tucks under the composer. The timeline fades at the top, and the header uses the toolbar colours.
- How T3 Code applies a theme. It sets each colour role as an `--app-theme-*` variable and the background image as `--theme-background-image`, and it adds the CSS in an adopted stylesheet after the page's own.

It doesn't copy T3 Code's palette derivation, contrast solving, theme storage, theme editor and import, asset transport, or CSS sanitizer. It's written from scratch in plain TypeScript, HTML, and CSS, with system fonts, and doesn't use any code, asset, or font from T3 Code.

The demo exists to show a theme reacting to the agent. It needs T3 Code's hooks and proportions for that, not its behaviour. It loads only files this repository built and checked, so it has no use for the sanitizer or the palette fallbacks. Whether T3 Code's sanitizer keeps a theme's CSS intact stays a check in the app itself.

## A fresh history

The repository's history starts with its own setup. Save Point's earlier versions stay on the `feature/t3code-themes` branch of my dotfiles repository, and the [changelog](../../CHANGELOG.md) gives the commit the theme came from. Those commits are under the dotfiles repository's paths and include a Nix module that this repository doesn't use.

## Departures from my usual defaults

I keep my defaults for TypeScript repositories as numbered cards in a private repository. This repository follows them except here.

- **Plain `fetch` in the demo (TD-CARD-001).** The cards put Effect at I/O boundaries, and the scripts use it. The demo page loads a theme with `fetch`, an `AbortController`, and a 10-second timeout instead, which keeps Effect out of the page.
- **A copied `.vale.ini` (TD-CARD-013).** The card points to a setup command that no longer exists as the only source of `.vale.ini`. This file copies the structure of the one in my [backpressure](https://github.com/mplibunao/backpressure) repository instead. It differs in four ways: `vale-ai-tells` at v1.37.0, the two `Unslop` rules from my global Vale configuration, `ai-tells.ColonUsage` off for Markdown, and a commit-message section that also matches the message file of a linked worktree.
- **FFmpeg from the `PATH` (TD-CARD-002).** The cards pin repository tools with mise. mise's FFmpeg backends either install builds younger than the seven-day waiting period, with dependencies that nobody checked, or compile from source with no checksum. The capture command takes FFmpeg from the `PATH` instead and stops with a message when it's missing. CI doesn't capture, so it doesn't need FFmpeg.
- **`pmOnFail: error` (TD-CARD-005).** The pnpm baseline sets `packageManagerStrictVersion: true`, which pnpm 11.28 ignores with a warning. With `pmOnFail: error`, pnpm refuses to run under another version.
- **Preset lint rules (TD-CARD-008).** The size limits apply outside the tests, and the depth, complexity, and parameter limits apply everywhere. `import/no-relative-parent-imports` is off, because the layout needs `../` imports and path aliases would add configuration that one package doesn't need. The folder-by-folder direction rules take its place. Under `src/save-point/`, `no-magic-numbers` is off, and `no-bitwise` is disabled where the seeded random numbers, the PNG checksum, and the dithering use bit arithmetic. The artwork is numbers by nature, and rewriting it would risk the output bytes.
