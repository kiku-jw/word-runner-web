# Implementation Notes

Canonical execution: [GitHub Issue #2](https://github.com/kiku-jw/word-runner-web/issues/2),
with the soundtrack follow-up tracked in
[GitHub Issue #3](https://github.com/kiku-jw/word-runner-web/issues/3) and the
three-level progression tracked in
[GitHub Issue #4](https://github.com/kiku-jw/word-runner-web/issues/4), and the
start-menu/timeout follow-up tracked in
[GitHub Issue #5](https://github.com/kiku-jw/word-runner-web/issues/5). Explicit
saved-run recovery and the optional review path are tracked in
[GitHub Issue #6](https://github.com/kiku-jw/word-runner-web/issues/6), and the
grounded world/gate motion follow-up is tracked in
[GitHub Issue #7](https://github.com/kiku-jw/word-runner-web/issues/7), and the
center-divider timeout reaction is tracked in
[GitHub Issue #8](https://github.com/kiku-jw/word-runner-web/issues/8).

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

The current content pack contains three open difficulty levels with four
six-word lessons per level: 12 lessons and 72 prototype-status concepts in
total. Easy retains the original concept and lesson IDs, so the version 1 local
storage contract accepts existing saves without migration. Medium and Hard use
new IDs, which also keeps concept progress naturally separate. The active level
picker is transient UI state derived from the selected lesson; no second
progress store or unlock state exists. A score of at least 8/10 offers the next
level without blocking any content.

The 48 new Medium and Hard concepts remain draft educational copy. Human
bilingual review is required before supervised child testing or any learning
claim.

The start menu reuses the same renderer and runner rig as gameplay. Attract mode
rotates the runner toward the camera and adds a small idle wave; selecting a
difficulty changes which first lesson the one-tap Play action starts. No menu
framework or second navigation state store was added. Every fresh page load
opens this menu, even when local storage contains an unfinished run or a result.
The saved state is preserved and exposed through an explicit Continue or Result
action; gameplay timers and music do not start until the child chooses to enter
the run. Starting a new run remains a separate explicit action.

The six-card word review remains available after choosing a lesson, but its
first card now also offers an immediate skip into gameplay. This supports both
preview-first children and children who prefer to learn through corrective
feedback without adding a second learning mode or storage contract.

Each active question uses a browser-native timeout: 10 seconds on Easy, 9 on
Medium, and 8 on Hard. When it expires, the engine resolves the opposite lane so
the existing spaced-error progress path remains the single source of truth, but
the presentation does not expose that internal lane: the runner stays centered,
both doors remain unselected, and the scene plays a center-divider collision.
The local `answer_selected` event records `inputMethod: timeout` and a null
selected side, while no `lane_selected` event is fabricated. The timer pauses
while the document is hidden and is cleared before answer feedback, preventing
a stale timeout from affecting the next question.

Concept cards use emoji glyphs, not a per-concept image bundle, and
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
the log records run starts, the selected difficulty, accepted control method,
and one renderer sample per run. The metrics view can export JSON or reset
local state. These records support a supervised pilot. They are not public
usage analytics and do not prove learning efficacy.

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
- Attract mode keeps the track and environment stationary while the front-facing
  runner waves. During play, gates share the environment's world displacement,
  begin farther away, and ease the whole scene to a stop near the decision zone.
  A wrong answer freezes forward motion and the running cycle during recoil;
  the gate no longer accelerates independently into the runner.
- Correction is a short, non-modal track overlay. It never dims the scene or
  intercepts input, while the DOM still owns readable word pairing and live
  status semantics.
- Generated static artwork is retained only for menus and the CSS fallback.

## Update policy

Update this file only when architecture, privacy boundaries, current asset
provenance, or durable follow-ups change. Command-by-command progress belongs
in the Issue and proof bundle, not here.
