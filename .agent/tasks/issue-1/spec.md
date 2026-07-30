# Issue 1 Proof Specification

## Task

Build, verify, and publish the Word Runner web prototype described in
`docs/prd-web-prototype.md` to the public `kiku-jw/word-runner-web` repository
and GitHub Pages.

## Frozen acceptance criteria

- **AC1:** A public GitHub Pages URL loads the current default-branch build and
  exposes no secrets or private source material.
- **AC2:** Four Ukrainian-to-English lessons contain exactly 24 valid concepts,
  with six concepts per lesson and one unambiguous answer per question.
- **AC3:** Every run contains ten scored gates, exposes every lesson concept,
  avoids more than three same-side answers, and requeues mistakes according to
  the PRD.
- **AC4:** Tap, horizontal swipe, and keyboard controls select both lanes without
  scrolling the play surface or accepting input during feedback.
- **AC5:** The first-use flow, lesson review, gameplay, corrective feedback,
  results, replay, and lesson return work without an account or backend.
- **AC6:** Progress, event metrics, child rating, and parent summary stay in
  browser-local storage; export and reset require explicit adult actions.
- **AC7:** No ads, payment code, remote analytics, cookies, child names,
  free-text child data, or automatic event transmission exist.
- **AC8:** Ukrainian child-facing copy, audio controls, reduced motion, keyboard
  focus, minimum touch targets, content failures, and responsive phone/tablet
  layouts are handled.
- **AC9:** Unit, type, build, browser, accessibility, offline-mid-session, and
  visual smoke checks pass from a clean install.
- **AC10:** README and implementation notes state the privacy boundary, metric
  semantics, local workflow, deployment workflow, known non-claims, and asset
  provenance.
- **AC11:** GitHub Actions deploys `dist` from `main` through the official Pages
  actions, and the live URL is read back after deployment.
- **AC12:** GitHub Issue #1 contains final verification evidence and an explicit
  terminal state.

## Constraints

- Static GitHub Pages deployment.
- No backend, authentication, cloud sync, analytics provider, PWA install flow,
  Phaser, Three.js, or reusable game-engine framework.
- No claims that engagement metrics prove learning, retention, demand, payment,
  or native-app viability.
- Use only public-safe, rights-clean repository content.
- Preserve the product boundaries in `docs/prd-web-prototype.md`.

## Assumptions

- Working name: Word Runner.
- Source locale: Ukrainian; target locale: English.
- The generated landscape is original project artwork.
- Browser speech synthesis is progressive enhancement; readable text and
  feedback remain sufficient when a voice is unavailable.
- Detailed engagement metrics are local pilot evidence, not remotely aggregated
  site analytics.

## Verification plan

1. Validate content and engine behavior with deterministic unit tests.
2. Type-check and produce a clean Vite build.
3. Run Playwright on phone, tablet, and desktop projects.
4. Run axe checks and reduced-motion/muted-audio scenarios.
5. Test reload recovery and connection loss after initial load.
6. Capture mobile and desktop screenshots from the production build.
7. Run Lighthouse against the production build.
8. Push `main`, wait for Pages deployment, and smoke the live URL.
9. Record command outputs and current commit SHA in `evidence.md` and
   `evidence.json`.

## Stop conditions

- Stop before publishing if any secret, private data, unlicensed asset, remote
  child telemetry, or unresolved critical accessibility defect is found.
- Stop and report if GitHub authentication, Pages permissions, or required
  external state cannot be proven after bounded retries.

