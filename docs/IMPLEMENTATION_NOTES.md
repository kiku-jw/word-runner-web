# Implementation Notes

Canonical execution: [GitHub Issue #2](https://github.com/kiku-jw/word-runner-web/issues/2),
with the soundtrack follow-up tracked in
[GitHub Issue #3](https://github.com/kiku-jw/word-runner-web/issues/3).

Public demo: [https://kiku-jw.github.io/word-runner-web/](https://kiku-jw.github.io/word-runner-web/).

## Architecture

The prototype is a static Vite and TypeScript application. `src/engine.ts`
owns question scheduling and content validation, `src/scene3d.ts` owns an
isolated procedural Three.js scene, `src/main.ts` coordinates DOM interaction
with that scene, and `src/storage.ts` keeps the pilot state in browser
`localStorage`. Native DOM remains the owner of readable prompts, controls,
feedback, accessibility, and adult metrics. No backend, remote analytics,
physics engine, UI framework, or model-loader runtime is part of the product.

Three.js `0.185.1` and its matching type package are the only new dependencies.
One renderer is reused across welcome and gameplay states. Mobile device pixel
ratio is capped at `1.25` and other devices at `1.5`; the automated browser
budget requires fewer than 100 draw calls after the scene settles. A local
development observation of approximately 60 FPS and 84 draw calls is useful
engineering evidence, not a promise for every pilot device.

## Content and audio

The current content pack contains four lessons and 24 prototype-reviewed
concepts. Concept cards use emoji glyphs, not a per-concept image bundle, and
pronunciation uses browser speech synthesis when available. Voice selection
prefers local English voices, then enhanced Apple voices such as Ava or
Samantha, with system Google and Microsoft voices as fallbacks. It does not
download audio or call a TTS service from application code. The generated
background and runner assets are documented in `public/assets/ASSETS.md`.

Four user-supplied background tracks ship as local 112 kbps stereo MP3 files.
The browser-native music controller starts only after a gameplay gesture, uses
a shuffled bag with no immediate cross-cycle repeat, fades each track in and
out, and caps its normal volume at 20%. The shared sound toggle pauses both
music and speech; pronunciation temporarily ducks music to 8%. Playback pauses
while the document is hidden and makes no remote audio request.

## Metrics boundary

Gameplay events stay only in the current browser unless an adult explicitly
exports them. In addition to completion, accuracy, replay, return, and enjoyment,
the log records run starts, accepted control method, and one renderer sample per
run. The metrics view can export JSON or reset local state. These records support
a supervised pilot. They are not public usage analytics and do not prove
learning efficacy.

## Visual direction

- Redesign-preserve pass for children aged 8–10.
- Design variance: 5.
- Motion intensity: 8, with a complete reduced-motion mode.
- Visual density: 4.
- One cobalt/sky-blue family with a lime success accent.
- A code-native low-poly Carpathian world with perspective road, water,
  mountains, trees, depth fog, a moving runner, and physical answer arches.
- The active answer panels are physical doors: a correct lane opens before the
  runner reaches it, while a wrong lane stays closed, absorbs the approach, and
  triggers a gentle recoil. Lateral velocity drives runner lean, and a correct
  streak modestly increases world speed without adding an economy.
- Correction is a short, non-modal track overlay. It never dims the scene or
  intercepts input, while the DOM still owns readable word pairing and live
  status semantics.
- Generated static artwork is retained only for menus and the CSS fallback.

## Update policy

Update this file only when architecture, privacy boundaries, current asset
provenance, or durable follow-ups change. Command-by-command progress belongs
in the Issue and proof bundle, not here.
