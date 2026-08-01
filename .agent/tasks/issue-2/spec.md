# Issue 2 Proof Specification

## Task

Replace the flat Word Runner play scene with a convincing mobile-first 3D
vertical slice, retain the learning and privacy contracts, and publish the
verified build to the existing public GitHub Pages site.

## Frozen acceptance criteria

- **AC1:** A WebGL2-capable browser renders a real perspective scene with a
  procedural runner, road, environment, and two labelled 3D gates.
- **AC2:** One tap starts the default run; lesson selection and review remain
  available as an optional path.
- **AC3:** Tap, horizontal swipe, and keyboard controls answer on both lanes;
  vertical drags and feedback-state double input do not answer.
- **AC4:** Ten-gate scheduling, corrective feedback, adaptive repeats, late
  mistake carryover, audio fallback, reload recovery, and replay remain intact.
- **AC5:** Prompts, controls, feedback, and accessibility stay in native DOM;
  browsers without WebGL2 retain the complete CSS two-choice flow.
- **AC6:** The renderer respects reduced motion, caps device pixel ratio, and
  stays below 100 settled draw calls in the reference browser.
- **AC7:** Run starts, accepted input methods, and one performance sample per
  run stay browser-local and appear only in the adult summary/export.
- **AC8:** No account, backend, ads, cookies, or remote gameplay telemetry are
  introduced.
- **AC9:** Phone 360x640, phone 390x844, tablet, and desktop flows pass browser,
  layout, offline, reload, accessibility, and fallback checks.
- **AC10:** A clean install, unit suite, type-check, build, dependency audit,
  Lighthouse smoke, and visual review pass.
- **AC11:** GitHub Actions publishes `main`; the live HTML and built asset
  hashes are read back and match the tested production output.
- **AC12:** GitHub Issue #2 receives final evidence and a terminal state.

## Constraints

- Use direct Three.js without React, a 3D framework, a physics engine, or a
  runtime model pipeline.
- Keep one procedural world and one reusable renderer.
- Keep the existing deterministic engine and local storage schema compatible.
- Treat engagement and performance telemetry as prototype diagnostics, not
  proof of learning, demand, or payment intent.

## Verification plan

1. Run unit, type, production build, and dependency checks from a clean install.
2. Run all browser scenarios across the four configured viewport projects.
3. Verify real canvas frames, draw-call and DPR budgets, local-only network
   behavior, WebGL fallback, reduced motion, and metrics export.
4. Review 390x844, 360x640, desktop, dark-mode, and reduced-motion screenshots.
5. Run Lighthouse against the local production build.
6. Push the release commit, wait for the Pages workflow, and compare live assets
   with the local build.
7. Record immutable evidence here and in GitHub Issue #2.

## Stop conditions

- Stop before publication if WebGL fallback is unusable, mobile interaction or
  learning recovery regresses, local-only privacy changes, the render budget is
  exceeded, or the deployed artifact differs from the tested build.
