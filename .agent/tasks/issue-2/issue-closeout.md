## Goal

Build, verify, and publish a convincing mobile-first 3D Word Runner vertical
slice without weakening the existing learning loop or local-only privacy model.

Canonical product requirements: `docs/prd-web-prototype.md`.

<!-- codex-state:start -->
- Status: Complete
- Next actor: Product owner
- Next action: Test the public build on representative child-held phones, then decide whether it earns a supervised engagement pilot
- Owning surface: `kiku-jw/word-runner-web` on `main`
<!-- codex-state:end -->

## Acceptance criteria

- [x] A real WebGL perspective scene renders the runner, road, environment, and
  two physical answer gates.
- [x] One-tap quick start and the optional lesson review path both work.
- [x] Tap, swipe, keyboard, vertical-drag rejection, and feedback input lock work.
- [x] Scheduling, correction, adaptive repeats, reload, offline play, audio
  fallback, results, replay, export, and reset remain intact.
- [x] DOM owns prompts, controls, feedback, and accessibility; CSS fallback works
  without WebGL2.
- [x] Reduced motion, DPR caps, and the sub-100 draw-call budget are verified.
- [x] 3D run/input/performance metrics remain local and export only on adult action.
- [x] Phone, tablet, desktop, accessibility, visual, build, audit, and Lighthouse
  checks pass.
- [x] Public Pages is deployed, independently opened, and hash-matched to `dist`.

## Proof

- Live: https://kiku-jw.github.io/word-runner-web/
- Release commit: `4f538b1c9bdd17eb3cf19e76767251119b27bebb`
- Workflow: https://github.com/kiku-jw/word-runner-web/actions/runs/30692513380
- Local gate: `npm ci && npm run qa && npm audit --audit-level=moderate`
- Result: 23 Vitest tests, 72 Playwright tests, and 0 audit vulnerabilities.
- Live renderer sample: 60 FPS, 87 draw calls, DPR 1 in reference Chromium.
- Live Lighthouse: performance 84, accessibility 100, best practices 100, SEO 100.
- Detailed proof: `.agent/tasks/issue-2/evidence.md` and `evidence.json`.

## Honest boundary

This is a public `SYNTHETIC DEMO`, not evidence of learning or demand. Before a
broader supervised child pilot, perform human bilingual review and real-device
testing on representative low-end mobile GPUs, including WebGL context loss.
