# mp-t3-code-themes

A TypeScript workspace that builds T3 Code themes.

## Commands

- `mise install` installs the pinned tools. `pnpm install` then installs dependencies and sets up the git hooks.
- `just setup` syncs the Vale packages. Run it after cloning and after `.vale.ini` changes.
- `just check` runs the gate: format check, lint, both TypeScript projects, and prose. CI runs the same recipe as `just ci`.
- `pnpm typecheck` checks `tsconfig.scripts.json` and `site/tsconfig.json`.

## Rules

- Branch names follow gitflow: `feature/`, `bugfix/`, `hotfix/`, `release/`.
- Commit messages follow Conventional Commits. The commit-msg hook runs Vale on each message and rejects AI attribution, such as an AI co-author trailer.
- The history becomes public at launch. Never commit workstation paths, personal data, credentials, agent transcripts, or session links.
- `docs/plans/`, `docs/ledgers/`, `docs/reviews/`, and `prompt-exports/` are local working folders. Never stage them. They stay out of `.gitignore` because RepoPrompt can't select ignored files.
- `mise.toml` and the pnpm catalog in `pnpm-workspace.yaml` pin every tool and dependency. A new version must be at least seven days old, and pnpm enforces that for packages. Don't weaken the cooldown or the trust policy to get an install through.
