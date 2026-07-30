# Implementation Notes

Canonical execution: [GitHub Issue #1](https://github.com/kiku-jw/word-runner-web/issues/1).

Public demo: [https://kiku-jw.github.io/word-runner-web/](https://kiku-jw.github.io/word-runner-web/).

## Architecture

The prototype is a static Vite and TypeScript application. `src/engine.ts`
owns question scheduling and content validation, `src/main.ts` owns rendering
and interaction, and `src/storage.ts` keeps the pilot state in browser
`localStorage`. The child flow stays in native DOM and CSS. No backend, no
remote analytics, and no framework runtime are part of the product.

## Content and audio

The current content pack contains four lessons and 24 prototype-reviewed
concepts. Concept cards use emoji glyphs, not a per-concept image bundle, and
pronunciation uses browser speech synthesis when available. The generated
background and runner assets are documented in `public/assets/ASSETS.md`.

## Metrics boundary

Gameplay events stay only in the current browser unless an adult explicitly
exports them. The metrics view can export JSON or reset local state. These
records support a supervised pilot. They are not public usage analytics and do
not prove learning efficacy.

## Visual direction

- Greenfield children’s game.
- Design variance: 6.
- Motion intensity: 6, with a complete reduced-motion mode.
- Visual density: 5.
- One cobalt/sky-blue family with a lime success accent.
- Original generated Carpathian-inspired background plus code-native gameplay
  layers.

## Update policy

Update this file only when architecture, privacy boundaries, current asset
provenance, or durable follow-ups change. Command-by-command progress belongs
in the Issue and proof bundle, not here.
