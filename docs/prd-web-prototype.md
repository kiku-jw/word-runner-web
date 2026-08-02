# MVP PRD — Word Runner Web Prototype

## Overview

- **Product name:** Word Runner (working title; final name `[TBD]`)
- **Product owner:** Nick
- **Document audience:** Product owner and AI implementation agent
- **Date:** 2026-08-01
- **Status:** Implemented 3D validation slice
- **Stage:** Validation prototype
- **MVP deadline:** `[TBD]`
- **Budget:** `[TBD]`
- **Method:** Validation-first, small supervised pilot

### Document lifecycle

- **Class:** Temporary task artifact.
- **Purpose:** Define the smallest web prototype that can test whether children understand, enjoy, and voluntarily replay the runner mechanic.
- **Sources:** Product decisions approved on 2026-07-30, the supplied visual reference, and the supplied market/learning review. Market claims from that review were not independently verified for this PRD.
- **Owner and update event:** The product owner updates this document when the approved MVP scope changes. Pilot evidence supersedes its hypotheses and thresholds.
- **Closure:** After a `CONTINUE`, `RESHAPE`, or `STOP/PARK` decision, move durable decisions and evidence to the owning implementation or experiment record, then archive or delete this PRD.
- **Default context:** Do not load this document by default outside work on this prototype.

---

## 1. Problem Statement

We believe children aged 8–10 may find short vocabulary practice more appealing when it is presented as a fast, readable runner rather than a sequence of conventional quiz screens.

The first prototype does **not** test whether the game teaches vocabulary. It tests a narrower prerequisite:

> Can a child understand the two-gate runner without repeated adult help, enjoy a short session, choose to replay it, and return to it later?

The supplied review indicates that similar educational runners exist, but it does not establish demand, repeat use, payment intent, or learning efficacy for this product. A detailed PRD must not be treated as validation evidence.

## 2. Target Users

### Primary pilot user

- A child aged 8–10.
- Reads Ukrainian at an age-appropriate level.
- Is beginning or continuing to learn basic English vocabulary.
- Uses a parent-controlled smartphone, tablet, or computer.
- Participates with a parent or supervising adult.

### Secondary user

- A parent or pilot facilitator who opens the prototype, confirms the pilot notice, helps only when the script permits, and reviews or exports the local session summary.

### Not for this MVP

- Children under 8.
- Independent public use without an adult.
- Teachers managing classes.
- Users seeking a complete language course.
- Users studying from Russian or another source language.
- Users who need right-to-left or non-Latin target scripts.

## 3. Product Hypothesis and Non-Claims

### Hypothesis under test

A portrait, two-lane vocabulary runner with immediate readable feedback will be understandable and enjoyable enough that a meaningful share of children voluntarily start another run and later return to the prototype.

### What success will not prove

Even if the pilot passes all metrics, it will not prove:

- vocabulary acquisition or delayed retention;
- transfer to reading, speech, listening, or spelling;
- parent willingness to pay;
- product-market fit;
- a need for native iOS or Android apps;
- suitability for an App Store or Google Play children’s category;
- scalability to other languages or school subjects.

Learning efficacy, payment intent, and native distribution require separate follow-up experiments.

## 4. User Stories

These stories require validation during the pilot.

- As a child, I want to understand what to do after a short demonstration so that I can start without reading long instructions.
- As a child, I want to move toward one of two large answers so that choosing feels like part of the run.
- As a child, I want a mistake to show me the right word without ending the game or making me feel punished.
- As a child, I want each run to be short and varied enough that I may choose to play again.
- As a parent, I want the prototype to work without an account, advertising, or automatic data transmission.
- As a parent or facilitator, I want to see and export a simple anonymous activity summary for the pilot.

## 5. Proposed Solution

The MVP is a portrait, mobile-first web prototype with a real-time 3D runner
scene and native DOM overlays:

1. An adult opens the prototype, confirms the local-only pilot notice, and sees
   the runner moving in the 3D world immediately.
2. The child can start a default `Тварини` run with one tap or open the lesson
   picker and review flow.
3. In the optional first visit to a selected lesson, the child reviews six word
   cards at their own pace. Each card contains:
   - an emoji glyph;
   - a Ukrainian source word;
   - an English target word;
   - a browser speech synthesis pronunciation button when speech is available.
4. The child starts a 10-question run lasting approximately 2–4 minutes.
5. A Ukrainian word appears above the track and two English answer gates appear ahead.
6. The child changes lane by tapping a side of the screen or swiping horizontally. Desktop QA also supports the left and right arrow keys.
7. At the gate, the game shows immediate feedback in a compact, non-modal track
   overlay for approximately 0.7–0.95 seconds:
   - the concept glyph;
   - the correct English word;
   - the Ukrainian word;
   - browser speech synthesis for the English word.
8. A wrong answer causes a gentle visual slowdown, not a lost life or failed run. The concept is eligible to return later in the same run.
9. The result screen shows words practised, accuracy, and one prominent replay action.
10. The parent can open a separate local summary and export an anonymous JSON record, then reset the same local browser data if needed.

## 6. Interaction and Game Rules

### 6.1 Visual hierarchy

- Show one readable decision pair at a time.
- Render the road, player, scenery, and answer arches with actual WebGL
  perspective and depth when WebGL2 is available.
- Keep prompts, readable gate hit areas, feedback, audio state, and progress in
  native DOM so the canvas is never the only interaction or accessibility layer.
- Preserve the complete two-choice flow with a simplified CSS scene when WebGL2
  is unavailable.
- Use Ukrainian for all child-facing navigation, instructions, and controls.
- The current Ukrainian prompt must be the largest text element in the play area.
- Gate labels must remain readable at the smallest supported viewport.
- Future decorative gates may be visible for depth, but their answer labels must not be legible before they become the active pair.
- Show progress as `current / 10`; do not show lives.
- Do not add a coin economy, shop, streak pressure, leaderboard, countdown timer, or advertising.
- Support portrait viewports from 360 × 640 through 430 × 932 CSS pixels and a 768 × 1024 tablet viewport; desktop support is required for QA, not as the primary layout.
- Interactive targets in the child flow must be at least 48 × 48 CSS pixels.

### 6.2 Controls

- A tap on the left or right half of the play area selects that lane.
- A horizontal swipe selects the direction only after passing a deliberate movement threshold.
- Vertical gestures must not trigger a lane change.
- While a run is active, browser scrolling and accidental text selection inside the play area must be prevented.
- The left and right arrow keys mirror touch controls for desktop use and QA.
- Input is ignored during the short answer-feedback state.

### 6.3 Run construction

- One lesson contains exactly six concepts.
- A standard run contains exactly ten scored gates.
- The first six scheduled gates expose each lesson concept once in randomized order.
- The remaining four gates are repeats selected from the same lesson.
- If the child answers incorrectly with at least two unscheduled positions remaining, place that concept 2–4 gates later by replacing a normal repeat.
- An error in either of the final two positions is prioritized at the beginning of the next run.
- A concept must not appear more than three times in one run.
- Randomize the correct side while preventing more than three consecutive correct answers on the same side.

### 6.4 Distractors

- Every question has exactly one valid answer.
- The distractor must belong to the approved distractor pool for that concept.
- It must not be a synonym, alternate accepted translation, spelling variant, or visually confusing duplicate.
- Prefer distractors from the same broad category and similar difficulty.
- Content validation must reject missing assets, duplicate concept IDs, invalid distractor references, and answer pairs with more than one defensible choice.

### 6.5 Feedback and results

- Correct answer: the selected door opens, the pace lifts, and the correct pair,
  image, and English audio remain readable without dimming the run.
- Wrong answer: the selected door stays closed and causes a gentle slowdown or
  soft collision, followed by the same correct pair, image, and audio.
- Do not use red failure screens, ridicule, loss of life, forced restart, or negative audio.
- Default feedback duration is approximately 760 ms for a correct answer and
  940 ms for a correction. It may extend only enough to avoid cutting off the
  target pronunciation.
- Results show:
  - `10` completed gates;
  - correct answers out of `10`;
  - the six practised words;
  - a primary “Run again” action;
  - a secondary “Back to lessons” action;
  - a five-point child-friendly enjoyment scale after the first completed run of a pilot session.

## 7. Content Scope

### Active pilot content

- Source language: Ukrainian (`uk`).
- Target language: English (`en`).
- Four lessons with six concepts each.
- Total active concepts: 24.
- The current public build ships the exact lessons `Тварини`, `Їжа й напої`, `Транспорт`, and `Природа`.
- Concepts use emoji glyphs and browser speech synthesis instead of a per-concept licensed image/audio bundle.
- Four local user-supplied music tracks provide a quiet shuffled background soundtrack; they are not concept content.
- All 24 concepts are marked `reviewStatus: "prototype"` in `src/content.ts`; a human bilingual review is still required before any child pilot beyond owner smoke use.
- Generated background and runner assets are documented in `public/assets/ASSETS.md`.

### Expansion boundary

The data format must support a future 100-concept pack without changing gameplay code. The MVP must not create or ship all 100 concepts.

### Asset requirements

- All content assets ship with the prototype; gameplay must not call remote image, text-to-speech, or translation services.
- The current concept layer uses browser-native emoji glyphs and browser speech synthesis, so the build does not ship a per-concept image/audio bundle.
- Background music ships locally, starts after a user gesture, targets 20% volume, fades between tracks, and follows the shared sound toggle.
- Generated background and runner assets are documented in `public/assets/ASSETS.md`.
- Asset source and license manifest: `public/assets/ASSETS.md`.
- Generated assets must also have a recorded source and review status.

## 8. Data Contracts

The following TypeScript-shaped contracts define the required data boundaries. Equivalent representations are acceptable if they preserve all fields and invariants.

```ts
interface ContentPack {
  schemaVersion: 1;
  id: string;
  title: string;
  sourceLocale: "uk";
  targetLocale: "en";
  concepts: Concept[];
  lessons: Lesson[];
}

interface Concept {
  id: string;
  source: { uk: string };
  target: { en: string };
  glyph: string;
  category: string;
  difficulty: 1 | 2 | 3;
  distractorIds: string[];
  reviewStatus: "prototype" | "approved";
}

interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  glyph: string;
  conceptIds: [string, string, string, string, string, string];
}

interface PilotState {
  schemaVersion: 1;
  participantId: string;
  noticeConfirmed: boolean;
  soundEnabled: boolean;
  activeLessonId: string | null;
  activeRun: RunState | null;
  reviewedLessonIds: string[];
  conceptProgress: Record<string, ConceptProgress>;
  eventLog: PilotEvent[];
}

interface ConceptProgress {
  attempts: number;
  correct: number;
  errors: number;
  lastSeenAt: string | null;
  prioritizeNextRun: boolean;
}

interface ActiveRun {
  schemaVersion: 1;
  id: string;
  lessonId: string;
  seed: number;
  startedAt: string;
  questionIndex: number;
  correctCount: number;
  status: "active" | "complete";
  questions: RunQuestion[];
  priorityNextRun: string[];
}

interface RunQuestion {
  id: string;
  conceptId: string;
  distractorId: string;
  correctSide: "left" | "right";
  selectedSide: "left" | "right" | null;
  origin: "base" | "repeat" | "correction";
}

type PilotEventType =
  | "session_started"
  | "session_resumed"
  | "run_started"
  | "question_shown"
  | "lane_selected"
  | "answer_selected"
  | "render_sampled"
  | "run_completed"
  | "replay_started"
  | "enjoyment_rated";

interface PilotEvent {
  schemaVersion: 1;
  id: string;
  type: PilotEventType;
  timestamp: string;
  participantId: string;
  sessionId: string;
  runId: string | null;
  lessonId: string | null;
  conceptId: string | null;
  selectedSide: "left" | "right" | null;
  inputMethod: "tap" | "swipe" | "keyboard" | null;
  correct: boolean | null;
  rating: number | null;
  fps: number | null;
  drawCalls: number | null;
  pixelRatio: number | null;
}
```

Each event may contain only:

- `schemaVersion`;
- event type;
- generated participant, session, and run IDs;
- ISO timestamp;
- lesson or concept ID when applicable;
- selected side and correctness when applicable;
- accepted input method when applicable;
- numeric enjoyment rating when applicable;
- one renderer FPS, draw-call, and pixel-ratio sample per run when WebGL is active.

No event may contain a child’s name, date of birth, contact details, free-text response, device advertising ID, IP address captured by application code, or precise location.

## 9. Privacy and Safety Constraints

- No account, login, child profile, email, or cloud synchronization.
- Generate a random participant ID locally.
- Store progress and events only in browser-local storage.
- Do not transmit analytics automatically.
- Export occurs only through an explicit adult action and produces a JSON file for the adult to review.
- Do not include third-party advertising, analytics, social sharing, external links in the child flow, or behavioural tracking.
- The prototype is a controlled pilot, not an unrestricted public children’s service.
- A future public or store release requires a separate current legal/policy review and is out of scope.

## 10. Scope

| IN — MVP | OUT — after validation |
|---|---|
| Portrait mobile-first web prototype | Native iOS or Android apps |
| One procedural WebGL runner world | Physics, multiple worlds, or character customization |
| Ukrainian-to-English only | Additional language directions |
| Four lessons and 24 prototype-reviewed concepts | Full 100-word pack |
| Six-card introduction per lesson | Complete teaching curriculum |
| Two gates and ten questions per run | More lanes, obstacles, power-ups, bosses, or endless mode |
| Tap, swipe, and keyboard controls | Gamepad and accessibility switch integrations |
| Immediate glyph/text feedback with optional browser pronunciation | Speech recognition, spelling, phonics, or free recall |
| Local progress and adaptive repeats | Cloud profiles, cross-device sync, classroom management |
| Local anonymous event log and adult export | Third-party analytics or remote dashboards |
| Public UX prototype for adult-supervised evaluation | Unsupervised child service |
| Child enjoyment prompt | Learning-efficacy study |
| Mid-session network-loss tolerance | Installable PWA and guaranteed offline reload |
| Basic muted-audio and reduced-motion support | Full localization and formal accessibility certification |
| Provenance-documented local assets | Live TTS, translation, or remote content APIs |
| No advertising or payments | Purchases, subscriptions, family unlocks, or content store |

## 11. P0 Requirements

- **P0-01:** The application must complete the full notice → quick start or
  lesson review → run → feedback → results → replay flow without an account or
  backend.
- **P0-02:** The active play area must work at supported portrait phone sizes without clipped prompts, gates, controls, or result actions.
- **P0-03:** A child must be able to select either lane by tapping or swiping, while desktop users can use arrow keys.
- **P0-04:** Every run must contain ten valid two-choice questions produced from one six-concept lesson.
- **P0-05:** Every answer must trigger immediate concept glyph, Ukrainian text, English text, and optional browser pronunciation feedback.
- **P0-06:** A wrong answer must not end the run or remove a life and must update the adaptive repeat state.
- **P0-07:** The application must persist active-run progress, concept counts, and local events across a normal page reload.
- **P0-08:** After the initial application and asset load, a connection loss must not interrupt the open run or require network calls to complete it.
- **P0-09:** Content loading must fail safely with a visible adult-facing error if the pack violates its schema or answer invariants.
- **P0-10:** The prototype must not send analytics or contain advertising, payments, social sharing, or external child-facing links.
- **P0-11:** The adult summary must show anonymous session metrics and export the allowed local event fields as JSON.
- **P0-12:** The default experience must honour muted audio and reduced-motion preferences without making the questions unusable.
- **P0-13:** All 24 concepts require bilingual owner review before a supervised child pilot; the public UX prototype must label them as prototype content until then.
- **P0-14:** All child-facing UI must be Ukrainian and remain readable and operable at the defined phone and tablet viewports.
- **P0-15:** A WebGL2-capable browser must show a perspective 3D road, animated
  runner, scenery, and physical answer gates without replacing the DOM control
  and feedback layer.
- **P0-16:** A browser without WebGL2 must retain a usable two-choice CSS flow.
- **P0-17:** The renderer must cap device pixel ratio and stay below 100 settled
  draw calls in the automated reference browser.

## 12. Success Metrics

The pilot target is 20 children; the minimum interpretable sample is 12 children who begin the first run.

| Metric | Target | How measured |
|---|---:|---|
| First-run completion | At least 80% | `run_completed` among children who started the first run |
| Adult help required | No more than one control prompt for at least 80% | Standard facilitator observation sheet |
| Voluntary same-session replay | At least 60% | `replay_started` before any adult suggestion and within five minutes of first results |
| Seven-day return | At least 40% | A later `session_started` 12 hours to 7 days after the first session, with no more than one neutral parent reminder |
| Enjoyment | Median at least 4/5 | First-session child-friendly rating |
| Control-related lost responses | No more than 10% | Standard facilitator observation sheet |
| Blocking reliability | Zero blocking failures during pilot sessions | Facilitator log and local export |
| Local progress integrity | 100% of tested reloads preserve valid state | Pre-pilot acceptance test |
| Reference renderer budget | Median FPS at least 45 and settled draw calls below 100 | One local sample per run plus pre-pilot browser QA |

These thresholds are decision gates chosen for the pilot; they are not existing market evidence.

## 13. Pilot Protocol

1. Recruit 12–20 children aged 8–10 through parent-approved participation.
2. Use a supported personal device and the same facilitator script for every first session.
3. The adult may help open the link and confirm the notice.
4. During onboarding and the first run, the adult may answer questions about the controls only once using the approved neutral phrase: `[TBD]`.
5. After first results, the adult remains neutral and does not suggest replay until the child has either chosen an action or five minutes have passed.
6. The child records the enjoyment rating after the first completed run.
7. The parent may give one neutral reminder to revisit the prototype during the following seven days.
8. At the end of the pilot window, the parent or facilitator reviews and explicitly exports the local summary.
9. Do not add a vocabulary pre-test, post-test, delayed knowledge test, or claim about learning to this pilot.
10. Record qualitative observations separately from application telemetry and do not treat parent praise as payment intent.

## 14. Decision Gates

### CONTINUE

Choose `CONTINUE` only if all primary engagement metrics pass and there are no unresolved child-safety, content-rights, or blocking reliability issues.

Next step: design a separate learning experiment that measures vocabulary outside the timed runner interface.

### RESHAPE

Choose `RESHAPE` when children understand and complete the game, but same-session replay or return misses the target.

Next step: compare the runner with one calm, untimed mode using the same content. Do not expand languages or build native apps.

### STOP/PARK

Choose `STOP/PARK` if, after one focused UX iteration:

- voluntary same-session replay remains below 40%; or
- seven-day return remains below 25%; or
- the mechanic repeatedly causes confusion, stress, motion discomfort, or adult intervention.

Do not rescue a failed gate by adding more content, platforms, monetization, or unrelated game systems.

## 15. Implementation Phases

### Phase 1 — Data and deterministic game loop

**Scope**

- Validate the content contract.
- Implement question scheduling, side balancing, error requeueing, and local state.
- Use the generated original background and runner assets, plus prototype-reviewed glyph-based concepts, for the current build.

**Testable output**

- Automated tests cover schema failures, ten-gate construction, all-six-concept exposure, side balancing, distractor validity, error requeueing, final-two-error carryover, and reload-safe serialization.

### Phase 2 — Playable responsive experience

**Dependencies:** Phase 1.

**Scope**

- Implement notice, one-tap quick start, lesson review, a procedural 3D runner,
  feedback, results, and replay.
- Implement touch, swipe, keyboard, audio mute, and reduced motion.
- Use one direct Three.js renderer; do not add a physics engine, 3D framework,
  or runtime model pipeline for this slice.
- Package all runtime content locally.

**Testable output**

- A complete run works on target portrait sizes and desktop QA.
- Disabling the network after initial load does not interrupt the open run.
- No third-party requests occur during gameplay.

### Phase 3 — Pilot instrumentation and acceptance

**Dependencies:** Phase 2 and approved 24-concept content pack.

**Scope**

- Add the constrained local event log, enjoyment prompt, adult summary, and explicit JSON export.
- Run adult smoke testing, language review, rights review, and device QA.

**Testable output**

- The pilot export contains only allowed fields.
- All P0 acceptance scenarios pass.
- The build is labelled as a controlled validation prototype and is ready for supervised use.

## 16. Acceptance Test Scenarios

1. **First-time happy path:** An adult confirms the notice; a child either uses
   one-tap quick start or reviews a selected lesson, finishes ten gates, sees
   results, and starts another run.
2. **3D presentation:** A WebGL2-capable browser shows a perspective road,
   moving player, scenery, and labelled arches; a browser without WebGL2 keeps
   usable DOM controls and the CSS scene.
3. **Both choices:** Correct answers on both left and right gates work through tap, swipe, and keyboard input.
4. **Gesture boundaries:** Short or vertical gestures do not change lanes; the page does not scroll during play.
5. **Wrong answer:** A mistake shows the correct pair and audio, does not end the run, and schedules a valid repeat when space permits.
6. **Late wrong answer:** A mistake in either of the last two gates marks the concept as prioritized for the next run.
7. **Side balance:** Generated runs never place the correct answer on one side more than three times consecutively.
8. **Content ambiguity:** A pack containing a missing concept, duplicate ID, invalid distractor, or multiple defensible answers is rejected before play.
9. **Reload recovery:** Reloading during a run restores the same run, question index, counts, and local log without duplicating the last answer.
10. **Connection loss:** Turning off the network after the app and assets load does not interrupt the current run.
11. **Audio muted:** The complete flow remains understandable with audio disabled.
12. **Reduced motion:** Reduced-motion mode removes nonessential movement while preserving lane selection and feedback.
13. **Small viewport:** The prompt, two gates, progress, and controls remain readable and tappable without horizontal scrolling.
14. **Privacy:** Network inspection shows no analytics transmission; exported JSON contains no prohibited personal or device fields.
15. **Asset failure:** A missing required local asset produces an adult-facing error rather than an incomplete child-facing question.
16. **Pilot metrics:** A facilitator can distinguish run starts, first completion,
    voluntary replay, later return, enjoyment, control method, and renderer health
    from the summary/export.

## 17. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| The runner is understood but becomes repetitive quickly | Keep sessions short; use four lessons; gate expansion on replay and return |
| Fast play tests motor skill more than vocabulary | Use two large lanes, no timer pressure, immediate feedback, and later evaluate learning separately |
| Future gates distract from the active choice | Keep future labels unreadable until active |
| Children feel punished by mistakes | No lives or forced restarts; use gentle correction and adaptive repeat |
| Motion or audio causes discomfort | Reduced motion, mute, short sessions, and facilitator observation |
| Ambiguous translations corrupt trust | Manual bilingual review and explicit distractor approval |
| Content production expands before validation | Ship 24 concepts while keeping only the schema ready for 100 |
| Local metrics are mistaken for market demand | State non-claims in the PRD and require a separate payment experiment |
| A web wrapper is mistaken for a native product | Require proven repeat use and explicit native/offline needs before mobile app work |

## 18. Open Questions

- Final product name: `[TBD]`.
- MVP deadline and budget: `[TBD]`.
- Supported browser/version matrix for the pilot: `[TBD]`.
- Approved single-sentence facilitator prompt for control help: `[TBD]`.
- Owner and location of the post-pilot evidence record: `[TBD]`.

These questions do not change the approved product hypothesis or MVP boundary, but the content, asset, browser, and facilitator items must be resolved before a pilot build can be accepted.

## 19. AI Implementation Guardrails

- Three.js is the explicit rendering dependency for the 3D validation slice. Do
  not add another framework, physics engine, backend, analytics SDK, content
  service, or state-management layer without a new implementation decision.
- Do not create native mobile projects, PWA installation flows, authentication, payments, advertising, cloud storage, or remote telemetry.
- Do not fabricate final translations, audio, images, licenses, pilot participants, observations, or metrics.
- Keep gameplay rules deterministic and unit-testable outside the visual renderer.
- Treat the supplied image as visual direction, not as a pixel-perfect target;
  actual 3D depth and motion are required for the current validation slice.
- Do not describe the prototype as educationally effective, market-validated, store-ready, or child-policy compliant based on this PRD alone.
