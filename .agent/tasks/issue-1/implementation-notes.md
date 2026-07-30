# Implementation Notes

## Decisions

- 2026-07-30: Use Vite, TypeScript, native DOM/CSS, and a pure game engine
  module. This keeps GitHub Pages static and avoids a framework or 3D engine.
- 2026-07-30: Use Vitest for deterministic engine/content tests and Playwright
  for browser behavior. These tools share the Vite/TypeScript boundary and give
  real touch, keyboard, reload, and screenshot proof.
- 2026-07-30: Keep detailed metrics local. Public aggregate analytics would
  require a new data controller/backend and would conflict with the child
  privacy boundary.
- 2026-07-30: Use browser speech synthesis as optional pronunciation. Do not
  distribute voice assets of uncertain licensing and do not call a remote TTS
  service.
- 2026-07-30: Use one generated original Carpathian-inspired track background.
  All gameplay UI, gates, and the runner remain code-native layers.

## Public build

- The public Pages URL is
  `https://kiku-jw.github.io/word-runner-web/`.
- The current build uses emoji glyphs and browser speech synthesis for concept
  feedback.
- The generated background and runner assets are documented in
  `public/assets/ASSETS.md`.

## Lazy-senior receipt

- lower rung: browser and static hosting platform primitives
- GitHub prior art: `runner game language:JavaScript stars:>10` plus
  `tinogarcia/runner-game`; simple static browser architecture was sufficient
- adoption: borrow architecture only; copy no external implementation
- new code justified: the two-choice learning loop, local metrics, and
  accessibility behavior are product-specific

## Deviations

- None yet.

## Follow-ups

- Exact 24-concept language review remains product-owner review, even though
  automated validation will guarantee structural correctness.
