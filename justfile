# Repository commands. CI runs `just ci`. `just check` runs the same gate locally.

# pipefail: a failed command on the left of a pipe fails the recipe.
set shell := ["bash", "-euo", "pipefail", "-c"]

vale := "vale --no-global --config .vale.ini --minAlertLevel=error"

check: ci

# Format check and lint, both TypeScript projects, the Vitest tests, prose, then the committed
# theme files against a fresh build.
ci:
    pnpm exec vp check
    pnpm run typecheck
    pnpm test
    just prose
    pnpm themes:check

# Sync the Vale packages named in .vale.ini. Run after cloning and after .vale.ini changes.
setup:
    vale --no-global sync

# Vale over the tracked Markdown files.
prose:
    git ls-files -z -- '*.md' ':(exclude)AGENTS.md' | xargs -0 -r {{ vale }}

# Vale over one commit message. The commit-msg hook runs this.
prose-commit file:
    {{ vale }} {{ quote(file) }}
