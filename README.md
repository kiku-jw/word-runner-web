# Word Runner Web Prototype

Public GitHub Pages demo: [https://kiku-jw.github.io/word-runner-web/](https://kiku-jw.github.io/word-runner-web/)

Word Runner is a portrait-first vocabulary runner for a supervised pilot. It is
a static Vite + TypeScript app that uses native DOM and CSS, a pure scheduling
engine, browser speech synthesis when available, and fully local metrics.

**Validation caveat:** this repository is a `SYNTHETIC DEMO` for UX, playflow,
and local telemetry. It does not prove learning efficacy, retention, payment
intent, or native-app viability.

![Word Runner gameplay on a 360 by 640 viewport](docs/images/gameplay-mobile.png)

## What it does

- Ukrainian child-facing UI with a two-gate runner loop.
- Four lessons, six concepts per lesson, 24 total concepts.
- Six-card review before the first run for each lesson.
- Ten-question runs with immediate correction and replay support.
- Parent gate with hold-to-open metrics, JSON export, and local reset.
- Local persistence only. No account, ads, backend, or remote analytics.

## What it does not do

- No backend or cloud sync.
- No remote analytics or advertising.
- No speech-recognition flow.
- No claims that the prototype teaches vocabulary on its own.
- No per-concept licensed image/audio pack in the current build.

## Quick start

```bash
npm install
npm run dev
```

Open the local Vite URL that the command prints.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the local Vite dev server. |
| `npm run test` | Run the Vitest unit suite. |
| `npm run build` | Type-check and build the production bundle. |
| `npm run test:e2e` | Run the Playwright browser suite. |
| `npm run check` | Run unit tests and the production build. |
| `npm run qa` | Run the full local QA flow: check + Playwright. |
| `npm run preview` | Serve the production build locally on `127.0.0.1:4173`. |

## Architecture

- `src/engine.ts` owns deterministic run construction, answer resolution, and
  content validation.
- `src/main.ts` owns rendering, input handling, feedback timing, parent gate,
  export, and reset.
- `src/storage.ts` keeps all pilot state in `localStorage` under
  `word-runner-pilot-v1`.
- `src/metrics.ts` records only local pilot events and computes the adult
  summary.
- `src/content.ts` defines the four lessons and 24 prototype-reviewed concepts.
- `public/assets/track-carpathians.webp` and `public/assets/runner.webp` are
  generated original assets documented in `public/assets/ASSETS.md`.

## Content model

The current content pack is `Українська → English` and contains these lessons:

- `Тварини`
- `Їжа й напої`
- `Транспорт`
- `Природа`

Each concept uses:

- a Ukrainian source word;
- an English target word;
- an emoji glyph for the concept card and feedback layer;
- browser speech synthesis for pronunciation when the browser supports it;
- lesson-scoped distractor IDs.

The content is prototype-reviewed, not final educational copy. If a future pack
adds real image or audio assets, that provenance must be reviewed separately.

## Local metrics

The adult metrics screen summarizes only browser-local events:

- `sessions` - distinct local session IDs that opened the prototype.
- `runs` - completed runs.
- `answers` - selected answers.
- `correctAnswers` - correct answers within the logged answers.
- `accuracyPercent` - correct answers divided by answers.
- `replays` - replay actions after a finished run.
- `returnSessions` - later sessions that start at least 12 hours after the
  first logged session.
- `averageEnjoyment` - mean child rating from 1 to 5, rounded to one decimal.
- `lastActivityAt` - timestamp of the latest logged event.

The export action writes the current participant ID, concept progress, and full
event log to a JSON file. Reset clears the same local browser state after an
explicit confirmation.

## Privacy boundary

- No account, login, email, or child profile.
- No cookies or remote analytics added by the app.
- No automatic network transmission of gameplay events.
- No names, free-text child responses, or device advertising IDs in the event
  model.
- The prototype continues to work after the initial load even if the network is
  dropped.

## Deployment

GitHub Actions publishes the production build to GitHub Pages from `main`.
The live site should resolve at:

- [https://kiku-jw.github.io/word-runner-web/](https://kiku-jw.github.io/word-runner-web/)

## Asset provenance

See [public/assets/ASSETS.md](public/assets/ASSETS.md) for the generated
background and runner provenance notes.
