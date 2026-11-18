# Changelog

## Unreleased

## 2026-11-19

The first version of this repository, built in pull requests [#1] to [#7].

### Added

- Save Point, a pixel-art night scene with a camp on the composer that reacts to the agent: resting, ready, working, and waiting. [#3]
- A live demo that imitates T3 Code's layout with a made-up conversation, with controls for the four states and three chat widths. [#5]
- `pnpm previews:capture`, which records the README's GIF and screenshots from the demo while its animations run. [#6]
- `pnpm themes:install`, which copies the committed theme files into a T3 Code home and asks `t3 theme show` once whether T3 Code lists them. [#4]
- `pnpm themes:build` and `pnpm themes:check`, and the `just check` gate that CI runs: type checks, lint, formatting, unit tests, the prose check, the theme-file check, the demo build, and the demo's browser tests. [#1], [#2], [#3], [#5]

Save Point started in my dotfiles repository, on the `feature/t3code-themes` branch at commit `302078b`. Here its generator is split into modules, and the built JSON and PNG are byte for byte the same as that commit's.

[#1]: https://github.com/mplibunao/mp-t3-code-themes/pull/1
[#2]: https://github.com/mplibunao/mp-t3-code-themes/pull/2
[#3]: https://github.com/mplibunao/mp-t3-code-themes/pull/3
[#4]: https://github.com/mplibunao/mp-t3-code-themes/pull/4
[#5]: https://github.com/mplibunao/mp-t3-code-themes/pull/5
[#6]: https://github.com/mplibunao/mp-t3-code-themes/pull/6
[#7]: https://github.com/mplibunao/mp-t3-code-themes/pull/7
