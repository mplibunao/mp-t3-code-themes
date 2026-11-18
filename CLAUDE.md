# mp-t3-code-themes

A TypeScript workspace that builds T3 Code themes.

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
- `pnpm previews:capture [id]` records `previews/<id>/` from the demo while its animations run. It builds the demo and serves it on `127.0.0.1:4173`. It writes `resting.png`, `ready.png`, `working.png`, `waiting.png`, and `preview.gif`, a 32-second loop. Without an id, it captures `save-point`. It needs `ffmpeg` on the `PATH` and a free port 4173, because it never uses a server it didn't start. It replaces the files only after it has recorded every one, and it stops when a frame starts more than 50 ms after its deadline. CI doesn't run it.
- `pnpm themes:install [id...] [--base-dir DIR]` copies the files in `themes/` into `<home>/userdata/themes` without rebuilding them. No ids means every theme. The home is `--base-dir`, then `T3CODE_HOME`, then `~/.t3`. The command then runs `t3 theme show --base-dir <home>` once and warns when a theme isn't listed. It exits 0 once it has copied the files, whatever the check finds.

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

## Rules

- Branch names follow gitflow: `feature/`, `bugfix/`, `hotfix/`, `release/`.
- Commit messages follow Conventional Commits. The commit-msg hook runs Vale on each message and rejects AI attribution, such as an AI co-author trailer.
- The history becomes public at launch. Never commit workstation paths, personal data, credentials, agent transcripts, or session links.
- `docs/plans/`, `docs/ledgers/`, `docs/reviews/`, and `prompt-exports/` are local working folders. Never stage them. They stay out of `.gitignore` because RepoPrompt can't select ignored files.
- A pull request with a change that shows in the demo includes a new capture from `pnpm previews:capture`. Its diff then shows the old and the new pictures side by side. Don't capture for a change that doesn't show: each new GIF adds its whole size to the history.
- `mise.toml` and the pnpm catalog in `pnpm-workspace.yaml` pin every tool and dependency. A new version must be at least seven days old, and pnpm enforces that for packages. Don't weaken the cooldown or the trust policy to get an install through.
