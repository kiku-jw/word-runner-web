## Goal

Build, verify, and publish a mobile-first Ukrainian-to-English two-lane
vocabulary runner as a public GitHub Pages prototype.

Canonical product requirements: `docs/prd-web-prototype.md`.

<!-- codex-state:start -->
- Status: Complete
- Next actor: Product owner
- Next action: Decide whether to run a bilingual content review and supervised child validation
- Owning surface: `kiku-jw/word-runner-web` on `main`
<!-- codex-state:end -->

## Acceptance criteria

- [x] Public, playable GitHub Pages URL works on mobile and desktop.
- [x] Four Ukrainian-to-English lessons provide 24 prototype-reviewed concepts.
- [x] Each run has ten valid two-choice gates, corrective feedback, and deterministic error requeueing.
- [x] Tap, swipe, keyboard, and vertical-drag rejection work without page-scroll conflicts.
- [x] Progress and detailed pilot metrics remain local; no ads, accounts, cookies, child profiling, or third-party analytics.
- [x] Parent-gated metrics show aggregate engagement and support JSON export/reset.
- [x] Reduced motion, muted or unavailable audio, responsive layouts, and safe failure states are handled.
- [x] Unit, browser, accessibility, offline, build, and Lighthouse checks pass.
- [x] README explains privacy, local development, metrics, non-claims, and deployment.
- [x] GitHub Pages deploys reproducibly from `main` and performs a live smoke.

## Proof

- Live: https://kiku-jw.github.io/word-runner-web/
- Implementation commit: `9a1271baa658710b68a3e2b6b087ab04004504b0`
- Successful workflow: https://github.com/kiku-jw/word-runner-web/actions/runs/30591713510
- Clean install: `npm ci && npm run qa`
- Result: 20 Vitest tests and 64 Playwright tests passed.
- Lighthouse local/live: 100 performance, 100 accessibility, 100 best practices, 100 SEO.
- Detailed evidence: `.agent/tasks/issue-1/evidence.md` and `evidence.json`.
- Screenshots: `.agent/tasks/issue-1/raw/gameplay-360x640.png` and `gameplay-desktop-1280x800.png`.

## Honest boundary

This is a public `SYNTHETIC DEMO` and validation candidate. The 24 concepts
still require human bilingual review before a supervised child pilot. Local
engagement metrics do not prove learning, demand, payment intent, or native-app
viability.
