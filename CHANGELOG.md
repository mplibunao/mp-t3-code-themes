# Changelog

## Unreleased

The first version of this repository.

### Added

- Save Point, a pixel-art night scene with a camp on the composer that reacts to the agent: resting, ready, working, and waiting.
- A live demo that imitates T3 Code's layout with a made-up conversation, with controls for the four states and three chat widths.
- `pnpm previews:capture`, which records the README's GIF and screenshots from the demo while its animations run.
- `pnpm themes:install`, which copies the committed theme files into a T3 Code home and asks `t3 theme show` once whether T3 Code lists them.
- `pnpm themes:build` and `pnpm themes:check`, and the `just check` gate that CI runs: type checks, lint, formatting, unit tests, the prose check, the theme-file check, the demo build, and the demo's browser tests.

Save Point started in my dotfiles repository, on the `feature/t3code-themes` branch at commit `302078b`. Here its generator is split into modules, and the built JSON and PNG are byte for byte the same as that commit's.
