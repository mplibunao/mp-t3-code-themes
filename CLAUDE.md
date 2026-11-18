# mp-t3-code-themes

A TypeScript workspace that builds T3 Code themes.

- The [README](README.md) covers [installing](README.md#install), [compatibility](README.md#compatibility), [developing](README.md#develop), [adding a theme](README.md#add-a-theme), [capturing previews](README.md#capture), and [recovery](README.md#recovery).
- [`docs/decisions/001-repository-shape.md`](docs/decisions/001-repository-shape.md) records the decisions behind the repository's layout and the reasons for them.

## What's generated

- Written by hand: `src/`, `scripts/`, `site/`, `test/`, `e2e/`, the configuration, and the documents.
- Generated and committed: `themes/`, by `pnpm themes:build`, and `previews/`, by `pnpm previews:capture`. Never edit them by hand. Change the source, then build or capture again.
- Generated and ignored: `dist/`, `.site-public/`, `reports/`, `.stryker-tmp/`, the test and Playwright output, and the Vale styles that `just setup` syncs into `styles/`. `styles/Unslop/` is tracked.

## Commands

- `mise install` installs the pinned tools. `pnpm install` then installs dependencies and sets up the git hooks.
- `just setup` syncs the Vale packages. Run it after cloning and after `.vale.ini` changes.
- `just check` runs the gate: format check, lint, the TypeScript projects, the Vitest tests, prose, `pnpm themes:check`, `pnpm build`, and `pnpm test:e2e`. CI runs the same recipe as `just ci`.
- `pnpm typecheck` checks `tsconfig.scripts.json`, `site/tsconfig.json`, and `e2e/tsconfig.json`. The browser tests have a project of their own because the code they run in the page needs the DOM library, which `tsconfig.scripts.json` leaves out.
- `pnpm test` runs the Vitest tests under `test/`.
- `pnpm themes:build` builds every theme into `themes/`. The files there are generated: change the source under `src/` and build again.
- `pnpm themes:check` builds every theme in memory and compares the result with `themes/`, byte for byte. It doesn't write files.
- `pnpm build` copies the committed files in `themes/` into `.site-public/themes/`, then builds the demo in `site/` into `dist/`, under the base path `/mp-t3-code-themes/`. It never rebuilds the themes.
- `pnpm dev` makes the same copy once, then serves the demo with Vite.
- `pnpm test:e2e` runs the Playwright tests in `e2e/` against `dist/`, so run `pnpm build` first. On a new machine, `pnpm exec playwright install chromium` downloads the pinned browser once.
- `pnpm previews:capture [id]` records `previews/<id>/` from the demo while its animations run, as [Capture](README.md#capture) describes. It never uses a server it didn't start, and it replaces the files only after it has recorded all of them. CI doesn't run it.
- `pnpm themes:install [id...] [--base-dir DIR]` copies the files in `themes/` into a T3 Code home and checks them once with `t3 theme show`, as [From a clone](README.md#from-a-clone) describes. Without `--base-dir` it writes into `T3CODE_HOME` or `~/.t3`, so give it a scratch folder when you try it.
- `pnpm test:mutation` runs Stryker over the contract, the renderer's helpers and CSS construction, publishing, and the installer, and writes its report to `reports/mutation/`. A reviewer runs it and decides what each surviving mutant means. It doesn't fail on the mutation score, and CI doesn't run it. What this lane can't catch, and the check that does, is explained in [Committed theme files](docs/decisions/001-repository-shape.md#committed-theme-files).

## Dependency directions

The renderer and the theme contract build themes in memory, the scripts run under Bun with Effect, and the site runs in the browser. Imports follow this table.

| Code                                         | May import                                                                                                                   | Must not import                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/catalog.ts`                             | Nothing                                                                                                                      | Any module                                                                        |
| `src/theme-contract.ts`, `src/save-point/**` | Each other, `src/catalog.ts`. The contract also imports Effect Schema, and `src/save-point/png.ts` also imports `node:zlib`. | `scripts/**`, `site/**`, any file-system, process, Bun, or browser API            |
| `scripts/**`                                 | Everything under `src/`, Effect and its platform packages, Playwright (capture only)                                         | `site/**`. Inside `scripts/lib/`: Bun globals and the Bun platform package.       |
| `site/**`                                    | `src/catalog.ts`, other modules under `site/`                                                                                | Everything else under `src/`, `scripts/**`, Effect, any Node or Bun API           |
| `test/**`, `e2e/**`                          | What they test. `e2e/**` reaches the site only through the browser.                                                          | Code under `src/`, `scripts/`, and `site/` doesn't import from `test/` or `e2e/`. |

The root `vite.config.ts` enforces the table with Oxlint's restricted-imports and restricted-globals rules. Those rules match the text of an import, not the file it resolves to. `tsconfig.scripts.json` has no DOM library, so TypeScript rejects `document` and `window` in `src/`. Bun's types still declare `fetch`, `navigator`, and a few other web APIs. The lint rules ban those in `src/`. `test/boundaries.test.ts` replays allowed and prohibited imports for each row through the real lint configuration. Change the table, the rules, and the test together.

## Checking a change

- `just check` passes. A renderer change comes with the rebuilt files in `themes/`, because `just check` runs `pnpm themes:check`.
- The demo isn't T3 Code. A change that shows in a theme also needs a person to check it in T3 Code 0.1.10 with the installed files. For Save Point, that check covers these points:
  - `t3 theme show` lists the theme, and `t3 theme set` selects it by id.
  - At least 65 seconds of the working state, without a break, show the slime, the bat, the ghost, and the dragon.
  - Ready, waiting, a narrow composer, and reduced motion each look right.
  - Message text and secondary text are readable over the landscape.
  - The stage stands on the composer, and on the question drawer while one is open.
- After that check, update [Compatibility](README.md#compatibility) with what was seen.
- Paused or seeked frames can differ from what running animations show, as the comments at the top of `scripts/lib/capture.ts` and `src/save-point/css/encounters.ts` explain. Don't judge an animation through Playwright's clock, `pause()`, `currentTime`, animation seeking, or virtual time. The capture command records running animations for this reason.

## Rules

- Branch names follow gitflow: `feature/`, `bugfix/`, `hotfix/`, `release/`.
- Commit messages follow Conventional Commits. The commit-msg hook runs Vale on each message and rejects AI attribution, such as an AI co-author trailer.
- The history is public. Never commit workstation paths, personal data, credentials, agent transcripts, or session links.
- `docs/plans/`, `docs/ledgers/`, `docs/reviews/`, and `prompt-exports/` are local working folders. Never stage them. They stay out of `.gitignore` because RepoPrompt can't select ignored files.
- A pull request with a change that shows in the demo includes a new capture from `pnpm previews:capture`. Its diff then shows the old and the new pictures side by side. Don't capture for a change that doesn't show: each new GIF adds its whole size to the history.
- `mise.toml` and the pnpm catalog in `pnpm-workspace.yaml` pin every tool and dependency. A new version must be at least seven days old, and pnpm enforces that for packages. Don't weaken the cooldown or the trust policy to get an install through.
