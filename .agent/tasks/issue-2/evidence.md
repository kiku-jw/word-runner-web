# Issue 2 Evidence

## Release summary

- Repository: `kiku-jw/word-runner-web`
- Public repository: <https://github.com/kiku-jw/word-runner-web>
- Public Pages site: <https://kiku-jw.github.io/word-runner-web/>
- 3D release commit: `4f538b1c9bdd17eb3cf19e76767251119b27bebb`
- Publication date: 2026-08-01

## GitHub Pages proof

- Actions run: <https://github.com/kiku-jw/word-runner-web/actions/runs/30692513380>
- Overall conclusion: `success`
- Build job: `91349655432` (`success`)
- Deploy job: `91350901066` (`success`)
- Workflow live-page verification: `success`
- Independent HTTP readback: `HTTP/2 200`
- Live HTML selected `index-7Ocliyeg.js` and `index-CUtVOKvD.css`.
- Live JavaScript SHA-256 matched local `dist`: `eabb3da9c97cb45f6846e89bd1331ec05f8754b4b89d3e1c4f0f05cee2b3091d`.
- Live CSS SHA-256 matched local `dist`: `4a59dc239ca20885632e57f0d09a6acba493657cd55e494e12020a71948ad1f3`.

## Local verification

```bash
npm ci && npm run qa && npm audit --audit-level=moderate
```

Observed after the final code changes:

- Clean lockfile install: 70 packages added, 71 audited.
- Dependency audit: 0 vulnerabilities.
- Vitest: 5 files and 23 tests passed.
- TypeScript and Vite production build: passed.
- Playwright: 72 tests passed across phone 360, phone 390, tablet, and desktop.
- Browser coverage included WebGL frames, quick start, DPR and draw-call budget,
  local renderer sampling, both lane choices, tap/swipe/keyboard, vertical-drag
  rejection, input lock, reload recovery, late-mistake carryover, offline play,
  speech fallback, WebGL2 fallback, layout, metrics, and axe smoke.

## Renderer and browser proof

- Live 390x844 Chromium sample after 4.3 seconds: 60 FPS, 87 draw calls,
  device pixel ratio 1.
- Desktop reduced-motion sample after 4.3 seconds: 60 FPS, 93 draw calls,
  device pixel ratio 1; decision cadence remained within the normal budget.
- Fresh live browser profile: 0 cookies, 0 console errors, 0 warnings.
- The six observed live requests were all same-origin GitHub Pages assets; no
  remote analytics or third-party gameplay traffic was observed.

## Lighthouse proof

### Local production preview

- Source: `.agent/tasks/issue-2/raw/lighthouse-local.json`
- Scores: performance 80, accessibility 100, best practices 100, SEO 100.
- FCP: 1652.73 ms; LCP: 2708.73 ms; TBT: 587 ms; CLS: 0.

### Public Pages

- Source: `.agent/tasks/issue-2/raw/lighthouse-live.json`
- Scores: performance 84, accessibility 100, best practices 100, SEO 100.
- FCP: 3076.68 ms; LCP: 3076.68 ms; TBT: 0 ms; CLS: 0.

These are single synthetic measurements, not guarantees for pilot hardware.
Three.js is required on the first screen because the 3D attract scene is the
prototype's tested hook; the production JavaScript is 148.90 kB gzip.

## Visual proof

- Welcome at 390x844: `.agent/tasks/issue-2/raw/welcome-390x844.png`
- Local gameplay at 390x844: `.agent/tasks/issue-2/raw/gameplay-390x844.png`
- Live gameplay at 390x844: `.agent/tasks/issue-2/raw/gameplay-live-390x844.png`
- Desktop dark and reduced motion: `.agent/tasks/issue-2/raw/gameplay-desktop-dark-reduced.png`
- README gameplay frame at 360x640: `docs/images/gameplay-mobile.png`

## Adversarial review resolution

Two valid findings were fixed and covered by the final tests:

1. Renderer sampling reset on every question, so a very fast run could complete
   without a sample. Sampling now accumulates per `runId`, with a full-run
   regression assertion.
2. Reduced motion slowed gate arrival almost threefold. Gate decision cadence
   is now stable while decorative world, character, and particle motion remain
   reduced, with an automated arrival-budget assertion.

No unresolved correctness, privacy, destructive-side-effect, or deployment
finding remained. Real low-end mobile GPUs and recovery after a WebGL context
loss remain device-test gaps.

## Honest product boundary

This is still a public `SYNTHETIC DEMO`. The 24 concepts require human bilingual
review before a broader supervised child pilot. Local engagement and renderer
metrics do not prove learning efficacy, retention, demand, payment intent, or
native-app viability.
