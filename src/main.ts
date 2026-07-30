import "./style.css";

import { CONTENT_PACK, conceptById } from "./content";
import {
  advanceRun,
  answerCurrent,
  createRun,
  optionsForQuestion,
  validateContentPack,
} from "./engine";
import {
  createPilotEvent,
  recordAnswerProgress,
  summarizeMetrics,
} from "./metrics";
import {
  clearState,
  loadState,
  saveState,
  serializePilotData,
} from "./storage";
import type {
  Concept,
  Lesson,
  PilotEventType,
  PilotState,
  Side,
} from "./types";

type Screen =
  | "welcome"
  | "lessons"
  | "review"
  | "run"
  | "result"
  | "parent-gate"
  | "metrics"
  | "content-error";

interface FeedbackState {
  correct: boolean;
  conceptId: string;
}

const appRoot = document.querySelector<HTMLElement>("#app");
if (!appRoot) {
  throw new Error("App root is missing.");
}
const root: HTMLElement = appRoot;
const canSpeak =
  typeof window.speechSynthesis !== "undefined" &&
  typeof window.SpeechSynthesisUtterance === "function";

const contentErrors = validateContentPack(CONTENT_PACK);
const loaded = loadState();
let state: PilotState = loaded.state;
let recoveredCompletion = false;
if (state.activeRun?.status === "active") {
  const interruptedQuestion =
    state.activeRun.questions[state.activeRun.currentIndex];
  if (interruptedQuestion && interruptedQuestion.selectedSide !== null) {
    const recoveredRun = advanceRun(state.activeRun);
    recoveredCompletion = recoveredRun.status === "complete";
    state = { ...state, activeRun: recoveredRun };
  }
}
let storageWarning = loaded.warning;
let storageWriteBlocked = loaded.warning !== null;
let screen: Screen = contentErrors.length > 0
  ? "content-error"
  : !state.noticeConfirmed
    ? "welcome"
    : state.activeRun?.status === "active"
      ? "run"
      : state.activeRun?.status === "complete"
        ? "result"
        : "lessons";
let screenBeforeParentGate: Screen = state.noticeConfirmed ? "lessons" : "welcome";
let reviewIndex = 0;
let feedback: FeedbackState | null = null;
let inputLocked = false;
let feedbackTimer: number | null = null;
let parentGateTimer: number | null = null;
let pointerStart: { x: number; y: number } | null = null;
let lastShownQuestionId: string | null = null;

const sessionId = randomId("session");
appendEvent("session_started");
if (recoveredCompletion && state.activeRun) {
  appendEvent("run_completed", {
    runId: state.activeRun.id,
    lessonId: state.activeRun.lessonId,
  });
} else if (state.activeRun?.status === "active") {
  appendEvent("session_resumed", {
    runId: state.activeRun.id,
    lessonId: state.activeRun.lessonId,
  });
}
persist();

function randomId(prefix: string): string {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${value}`;
}

function runSeed(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
  }
  return Date.now() >>> 0;
}

function asset(name: string): string {
  return `${import.meta.env.BASE_URL}assets/${name}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function appendEvent(
  type: PilotEventType,
  details: Parameters<typeof createPilotEvent>[3] = {},
): void {
  state = {
    ...state,
    eventLog: [
      ...state.eventLog,
      createPilotEvent(state, sessionId, type, details),
    ],
  };
}

function persist(): void {
  if (storageWriteBlocked) {
    return;
  }
  const warning = saveState(state);
  if (warning !== null) {
    storageWarning = warning;
  }
}

function updateState(nextState: PilotState): void {
  state = nextState;
  persist();
}

function sceneStart(classes = ""): string {
  return `
    <section
      class="scene ${classes}"
      style="--scene-image: url('${asset("track-carpathians.webp")}')"
    >
  `;
}

function topBar(options: {
  back?: boolean;
  progress?: string;
  label?: string;
} = {}): string {
  return `
    <header class="top-bar">
      ${
        options.back
          ? `<button class="icon-button" type="button" data-action="back" aria-label="Назад">Назад</button>`
          : `<span class="brand-mark" aria-label="Словобіг">Словобіг</span>`
      }
      ${
        options.progress
          ? `<span class="progress-count" aria-label="Прогрес">${escapeHtml(options.progress)}</span>`
          : `<span class="top-label">${escapeHtml(options.label ?? "")}</span>`
      }
      ${
        canSpeak
          ? `
            <button
              class="icon-button sound-button"
              type="button"
              data-action="toggle-sound"
              aria-pressed="${String(state.soundEnabled)}"
            >
              ${state.soundEnabled ? "Звук: так" : "Звук: ні"}
            </button>
          `
          : `<span class="audio-status">Без озвучення</span>`
      }
    </header>
  `;
}

function warningMarkup(): string {
  if (storageWarning === null) {
    return "";
  }
  return `
    <div class="local-warning" role="status">
      <span>${escapeHtml(storageWarning)}</span>
      <button type="button" data-action="dismiss-warning">Закрити</button>
    </div>
  `;
}

function footerNote(): string {
  return `
    <p class="prototype-note">
      Прототип перевіряє цікавість до гри. Він ще не доводить навчальний ефект.
    </p>
  `;
}

function renderWelcome(): string {
  return `
    ${sceneStart("scene-welcome")}
      <div class="scene-scrim"></div>
      <div class="welcome-layout">
        <div class="welcome-copy">
          <span class="welcome-kicker">Українська + English</span>
          <h1>Словобіг</h1>
          <p>Обери правильне слово і пройди десять воріт.</p>
        </div>
        <div class="welcome-runner" aria-hidden="true">
          <img src="${asset("runner.webp")}" alt="" width="1024" height="1536" />
        </div>
        <div class="welcome-actions">
          <button class="primary-button" type="button" data-action="accept-notice">
            Почати
          </button>
          <button class="text-button" type="button" data-action="open-parent-gate">
            Для дорослих
          </button>
          <p class="privacy-line">
            Без акаунта і реклами. Дані лишаються у цьому браузері.
          </p>
        </div>
      </div>
      ${warningMarkup()}
    </section>
  `;
}

function lessonStats(lesson: Lesson): string {
  const attempts = lesson.conceptIds.reduce(
    (total, conceptId) =>
      total + (state.conceptProgress[conceptId]?.attempts ?? 0),
    0,
  );
  return attempts === 0 ? "Новий набір" : `${attempts} відповідей`;
}

function renderLessons(): string {
  return `
    ${sceneStart("scene-menu")}
      <div class="scene-scrim menu-scrim"></div>
      ${topBar({ label: "Обери набір" })}
      <div class="menu-scroll">
        <section class="lesson-panel" aria-labelledby="lesson-heading">
          <div class="section-heading">
            <h1 id="lesson-heading">Куди біжимо?</h1>
            <p>Спочатку переглянь шість слів. Потім починай забіг.</p>
          </div>
          <div class="lesson-grid">
            ${CONTENT_PACK.lessons
              .map(
                (lesson) => `
                  <button
                    class="lesson-card"
                    type="button"
                    data-lesson-id="${escapeHtml(lesson.id)}"
                  >
                    <span class="lesson-glyph" aria-hidden="true">${lesson.glyph}</span>
                    <strong>${escapeHtml(lesson.title)}</strong>
                    <span>${escapeHtml(lesson.subtitle)}</span>
                    <small>${lessonStats(lesson)}</small>
                  </button>
                `,
              )
              .join("")}
          </div>
          <button class="text-button adult-entry" type="button" data-action="open-parent-gate">
            Метрики для дорослих
          </button>
          ${footerNote()}
        </section>
      </div>
      ${warningMarkup()}
    </section>
  `;
}

function activeLesson(): Lesson {
  const lessonId = state.activeLessonId ?? state.activeRun?.lessonId;
  const lesson = CONTENT_PACK.lessons.find((candidate) => candidate.id === lessonId);
  if (!lesson) {
    throw new Error("Active lesson is missing.");
  }
  return lesson;
}

function renderReview(): string {
  const lesson = activeLesson();
  const conceptId = lesson.conceptIds[reviewIndex];
  if (!conceptId) {
    throw new Error("Review concept is missing.");
  }
  const concept = conceptById(CONTENT_PACK, conceptId);
  const alreadyReviewed = state.reviewedLessonIds.includes(lesson.id);
  return `
    ${sceneStart("scene-review")}
      <div class="scene-scrim review-scrim"></div>
      ${topBar({
        back: true,
        progress: `${reviewIndex + 1} / ${lesson.conceptIds.length}`,
      })}
      <section class="review-layout" aria-labelledby="review-source">
        <div class="word-card">
          <span class="word-glyph" role="img" aria-label="${escapeHtml(concept.source.uk)}">
            ${concept.glyph}
          </span>
          <span class="source-word" id="review-source">${escapeHtml(concept.source.uk)}</span>
          <strong class="target-word">${escapeHtml(concept.target.en)}</strong>
          ${
            canSpeak
              ? `
                <button class="speak-button" type="button" data-action="speak-current">
                  Прослухати слово
                </button>
              `
              : `<p class="audio-unavailable">Озвучення недоступне</p>`
          }
        </div>
        <div class="review-controls">
          <button
            class="secondary-button"
            type="button"
            data-action="review-previous"
            ${reviewIndex === 0 ? "disabled" : ""}
          >
            Назад
          </button>
          <button class="primary-button" type="button" data-action="review-next">
            ${
              reviewIndex === lesson.conceptIds.length - 1
                ? "До забігу"
                : "Наступне"
            }
          </button>
        </div>
        ${
          alreadyReviewed
            ? `<button class="text-button" type="button" data-action="start-run">Одразу бігти</button>`
            : ""
        }
      </section>
      ${warningMarkup()}
    </section>
  `;
}

function ensureQuestionShown(): void {
  const run = state.activeRun;
  const question = run?.questions[run.currentIndex];
  if (!run || !question || question.id === lastShownQuestionId) {
    return;
  }
  lastShownQuestionId = question.id;
  appendEvent("question_shown", {
    runId: run.id,
    lessonId: run.lessonId,
    conceptId: question.conceptId,
  });
  persist();
}

function renderGate(
  side: Side,
  label: string,
  selectedSide: Side | null,
): string {
  const selectedClass = selectedSide === side ? " is-selected" : "";
  return `
    <button
      class="answer-gate gate-${side}${selectedClass}"
      type="button"
      data-side="${side}"
      aria-label="${escapeHtml(label)}. ${side === "left" ? "Ліві" : "Праві"} ворота"
      ${inputLocked ? "disabled" : ""}
    >
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

function renderFeedback(): string {
  if (feedback === null) {
    return "";
  }
  const concept = conceptById(CONTENT_PACK, feedback.conceptId);
  return `
    <div class="feedback-layer" role="status" aria-live="assertive">
      <div class="feedback-card ${feedback.correct ? "feedback-correct" : "feedback-correction"}">
        <span class="feedback-glyph" aria-hidden="true">${concept.glyph}</span>
        <div>
          <span class="feedback-label">${feedback.correct ? "Правильно" : "Запам’ятай"}</span>
          <strong>${escapeHtml(concept.target.en)}</strong>
          <span>${escapeHtml(concept.source.uk)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderRun(): string {
  const run = state.activeRun;
  if (!run || run.status !== "active") {
    screen = "lessons";
    return renderLessons();
  }
  ensureQuestionShown();
  const question = run.questions[run.currentIndex];
  if (!question) {
    throw new Error("Run question is missing.");
  }
  const concept = conceptById(CONTENT_PACK, question.conceptId);
  const options = optionsForQuestion(CONTENT_PACK, question);
  const selectedSide = question.selectedSide;
  return `
    ${sceneStart("scene-run")}
      <div class="run-contrast"></div>
      ${topBar({ progress: `${run.currentIndex + 1} / ${run.questions.length}` })}
      <section
        class="game-stage"
        data-testid="game-stage"
        aria-label="Ігрова доріжка. Обери ліві або праві ворота."
      >
        <div class="prompt-cloud">
          <span>Обери переклад</span>
          <h1>${escapeHtml(concept.source.uk)}</h1>
        </div>
        <div class="future-gates" aria-hidden="true">
          <span></span><span></span>
        </div>
        <div class="gate-field" data-testid="gate-field">
          ${renderGate("left", options.left.target.en, selectedSide)}
          ${renderGate("right", options.right.target.en, selectedSide)}
        </div>
        <img
          class="runner-sprite lane-${selectedSide ?? "center"}"
          src="${asset("runner.webp")}"
          alt=""
          width="1024"
          height="1536"
          aria-hidden="true"
        />
        <p class="control-hint">Торкнися воріт, свайпни або натисни ← →</p>
        ${renderFeedback()}
      </section>
      ${warningMarkup()}
    </section>
  `;
}

function resultConcepts(): Concept[] {
  const run = state.activeRun;
  if (!run) {
    return [];
  }
  const ids = [...new Set(run.questions.map((question) => question.conceptId))];
  return ids.map((id) => conceptById(CONTENT_PACK, id));
}

function currentRunWasRated(): boolean {
  const runId = state.activeRun?.id;
  return state.eventLog.some(
    (event) => event.type === "enjoyment_rated" && event.runId === runId,
  );
}

function renderResult(): string {
  const run = state.activeRun;
  if (!run || run.status !== "complete") {
    screen = "lessons";
    return renderLessons();
  }
  const concepts = resultConcepts();
  const rated = currentRunWasRated();
  return `
    ${sceneStart("scene-result")}
      <div class="scene-scrim result-scrim"></div>
      ${topBar({ label: "Фініш" })}
      <div class="result-scroll">
        <section class="result-panel" aria-labelledby="result-heading">
          <div class="result-score">
            <span>${run.correctCount}</span>
            <small>з ${run.questions.length} правильних</small>
          </div>
          <h1 id="result-heading">Забіг завершено</h1>
          <div class="practised-words" aria-label="Слова цього забігу">
            ${concepts
              .map(
                (concept) => `
                  <span title="${escapeHtml(concept.source.uk)}">
                    <b aria-hidden="true">${concept.glyph}</b>
                    ${escapeHtml(concept.target.en)}
                  </span>
                `,
              )
              .join("")}
          </div>
          ${
            rated
              ? `<p class="rating-thanks">Дякуємо за оцінку.</p>`
              : `
                <fieldset class="rating-group">
                  <legend>Наскільки сподобався забіг?</legend>
                  <div>
                    ${[
                      ["1", "😕"],
                      ["2", "🙁"],
                      ["3", "😐"],
                      ["4", "🙂"],
                      ["5", "😄"],
                    ]
                      .map(
                        ([value, face]) => `
                          <button
                            type="button"
                            data-rating="${value}"
                            aria-label="${value} з 5"
                          >${face}</button>
                        `,
                      )
                      .join("")}
                  </div>
                </fieldset>
              `
          }
          <button class="primary-button" type="button" data-action="replay">
            Бігти ще раз
          </button>
          <button class="secondary-button" type="button" data-action="back-to-lessons">
            Інший набір
          </button>
          ${footerNote()}
        </section>
      </div>
      ${warningMarkup()}
    </section>
  `;
}

function renderParentGate(): string {
  return `
    ${sceneStart("scene-parent-gate")}
      <div class="scene-scrim parent-scrim"></div>
      <section class="parent-gate-panel" aria-labelledby="parent-gate-heading">
        <button class="close-button" type="button" data-action="close-parent-gate">
          Закрити
        </button>
        <h1 id="parent-gate-heading">Розділ для дорослих</h1>
        <p>Утримуйте кнопку дві секунди. Дитячі дані не надсилаються в інтернет.</p>
        <button class="hold-button" type="button" data-action="hold-parent-gate">
          <span>Утримувати</span>
        </button>
      </section>
    </section>
  `;
}

function formatDate(value: string | null): string {
  if (value === null) {
    return "Ще немає";
  }
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderMetrics(): string {
  const summary = summarizeMetrics(state.eventLog);
  const conceptRows = CONTENT_PACK.concepts
    .map((concept) => {
      const progress = state.conceptProgress[concept.id];
      if (!progress) {
        return "";
      }
      const accuracy =
        progress.attempts === 0
          ? 0
          : Math.round((progress.correct / progress.attempts) * 100);
      return `
        <tr>
          <th scope="row">${concept.glyph} ${escapeHtml(concept.source.uk)}</th>
          <td>${progress.attempts}</td>
          <td>${accuracy}%</td>
          <td>${progress.errors}</td>
        </tr>
      `;
    })
    .join("");
  return `
    <section class="metrics-screen">
      <header class="metrics-header">
        <div>
          <span>Лише цей браузер</span>
          <h1>Метрики пілоту</h1>
        </div>
        <button class="close-button" type="button" data-action="close-metrics">
          Закрити
        </button>
      </header>
      <div class="metric-grid" aria-label="Зведені метрики">
        <article><strong>${summary.runs}</strong><span>забігів</span></article>
        <article><strong>${summary.accuracyPercent}%</strong><span>точність у грі</span></article>
        <article><strong>${summary.replays}</strong><span>повторів</span></article>
        <article><strong>${summary.returnSessions}</strong><span>повернень після 12 год</span></article>
        <article><strong>${summary.averageEnjoyment ?? "Немає"}</strong><span>середня оцінка</span></article>
        <article><strong>${summary.sessions}</strong><span>сесій</span></article>
      </div>
      <section class="metrics-detail" aria-labelledby="detail-heading">
        <div class="metrics-copy">
          <h2 id="detail-heading">Що записано</h2>
          <p>
            Час подій, вибір воріт, правильність, повтори та оцінка. Імен,
            контактів, реклами, cookies і віддаленої аналітики немає.
          </p>
          <p><strong>Остання дія:</strong> ${formatDate(summary.lastActivityAt)}</p>
          <p><strong>Локальний ID:</strong> <code>${escapeHtml(state.participantId.slice(0, 12))}…</code></p>
        </div>
        <div
          class="table-wrap"
          tabindex="0"
          aria-label="Таблиця локального прогресу за словами"
        >
          <table>
            <thead>
              <tr><th>Слово</th><th>Спроби</th><th>Точність</th><th>Помилки</th></tr>
            </thead>
            <tbody>
              ${
                conceptRows ||
                `<tr><td colspan="4">Відповідей ще немає.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </section>
      <div class="metrics-actions">
        <button class="primary-button" type="button" data-action="export-metrics">
          Експортувати JSON
        </button>
        <button class="danger-button" type="button" data-action="reset-metrics">
          Стерти локальні дані
        </button>
      </div>
      <p class="metrics-nonclaim">
        Ці числа описують використання прототипу. Вони не вимірюють вивчення слів.
      </p>
      ${warningMarkup()}
    </section>
  `;
}

function renderContentError(): string {
  return `
    <section class="fatal-screen" role="alert">
      <div>
        <span>Для дорослих</span>
        <h1>Набір слів не пройшов перевірку</h1>
        <p>Гру зупинено, щоб не показувати неоднозначні або неповні запитання.</p>
        <ul>
          ${contentErrors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}
        </ul>
      </div>
    </section>
  `;
}

function render(): void {
  if (feedbackTimer !== null && screen !== "run") {
    window.clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }
  root.innerHTML = (() => {
    switch (screen) {
      case "welcome":
        return renderWelcome();
      case "lessons":
        return renderLessons();
      case "review":
        return renderReview();
      case "run":
        return renderRun();
      case "result":
        return renderResult();
      case "parent-gate":
        return renderParentGate();
      case "metrics":
        return renderMetrics();
      case "content-error":
        return renderContentError();
    }
  })();
  bindInteractions();
}

function currentConcept(): Concept | null {
  if (screen === "review") {
    const lesson = activeLesson();
    const conceptId = lesson.conceptIds[reviewIndex];
    return conceptId ? conceptById(CONTENT_PACK, conceptId) : null;
  }
  const run = state.activeRun;
  const question = run?.questions[run.currentIndex];
  return question ? conceptById(CONTENT_PACK, question.conceptId) : null;
}

function speak(concept: Concept | null): void {
  if (
    concept === null ||
    !state.soundEnabled ||
    !canSpeak
  ) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(concept.target.en);
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  utterance.pitch = 1.03;
  window.speechSynthesis.speak(utterance);
}

function toggleSound(): void {
  if (canSpeak) {
    window.speechSynthesis.cancel();
  }
  updateState({ ...state, soundEnabled: !state.soundEnabled });
  render();
}

function openLesson(lessonId: string): void {
  const lesson = CONTENT_PACK.lessons.find((candidate) => candidate.id === lessonId);
  if (!lesson) {
    return;
  }
  reviewIndex = 0;
  updateState({ ...state, activeLessonId: lesson.id, activeRun: null });
  screen = "review";
  render();
}

function startRun(isReplay = false): void {
  const lesson = activeLesson();
  const progressPriority = lesson.conceptIds.filter(
    (conceptId) => state.conceptProgress[conceptId]?.prioritizeNextRun,
  );
  const runPriority = isReplay
    ? (state.activeRun?.priorityNextRun ?? [])
    : [];
  const priority = [...new Set([...runPriority, ...progressPriority])];
  const run = createRun(CONTENT_PACK, lesson.id, runSeed(), priority);
  if (isReplay) {
    appendEvent("replay_started", { runId: run.id, lessonId: lesson.id });
  }
  updateState({
    ...state,
    activeLessonId: lesson.id,
    activeRun: run,
    reviewedLessonIds: state.reviewedLessonIds.includes(lesson.id)
      ? state.reviewedLessonIds
      : [...state.reviewedLessonIds, lesson.id],
  });
  lastShownQuestionId = null;
  feedback = null;
  inputLocked = false;
  screen = "run";
  render();
}

function finishCurrentRun(): void {
  const run = state.activeRun;
  if (!run) {
    return;
  }
  appendEvent("run_completed", {
    runId: run.id,
    lessonId: run.lessonId,
  });
  persist();
  feedback = null;
  inputLocked = false;
  screen = "result";
  render();
}

function answer(side: Side): void {
  const run = state.activeRun;
  if (screen !== "run" || inputLocked || !run) {
    return;
  }
  inputLocked = true;
  const question = run.questions[run.currentIndex];
  if (!question) {
    inputLocked = false;
    return;
  }
  const result = answerCurrent(CONTENT_PACK, run, side);
  const timestamp = new Date().toISOString();
  feedback = { correct: result.correct, conceptId: question.conceptId };
  state = {
    ...state,
    activeRun: result.run,
    conceptProgress: recordAnswerProgress(
      state.conceptProgress,
      result.run,
      result.correct,
      timestamp,
    ),
  };
  appendEvent(
    "answer_selected",
    {
      runId: result.run.id,
      lessonId: result.run.lessonId,
      conceptId: question.conceptId,
      selectedSide: side,
      correct: result.correct,
    },
  );
  persist();
  speak(conceptById(CONTENT_PACK, question.conceptId));
  render();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  feedbackTimer = window.setTimeout(() => {
    feedbackTimer = null;
    const active = state.activeRun;
    if (!active) {
      return;
    }
    const advanced = advanceRun(active);
    state = { ...state, activeRun: advanced };
    persist();
    if (advanced.status === "complete") {
      finishCurrentRun();
      return;
    }
    feedback = null;
    inputLocked = false;
    render();
  }, reduceMotion ? 700 : 1_000);
}

function openParentGate(): void {
  screenBeforeParentGate = screen;
  screen = "parent-gate";
  render();
}

function beginParentHold(button: HTMLButtonElement): void {
  if (parentGateTimer !== null) {
    return;
  }
  button.classList.add("is-holding");
  parentGateTimer = window.setTimeout(() => {
    parentGateTimer = null;
    screen = "metrics";
    render();
  }, 2_000);
}

function cancelParentHold(button?: HTMLButtonElement): void {
  if (parentGateTimer !== null) {
    window.clearTimeout(parentGateTimer);
    parentGateTimer = null;
  }
  button?.classList.remove("is-holding");
}

function exportMetrics(): void {
  const blob = new Blob([serializePilotData(state)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `word-runner-${state.participantId.slice(0, 8)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function handleAction(action: string): void {
  switch (action) {
    case "accept-notice":
      updateState({ ...state, noticeConfirmed: true });
      screen = "lessons";
      render();
      break;
    case "open-parent-gate":
      openParentGate();
      break;
    case "close-parent-gate":
      cancelParentHold();
      screen = screenBeforeParentGate;
      render();
      break;
    case "close-metrics":
      screen = state.noticeConfirmed ? "lessons" : "welcome";
      render();
      break;
    case "toggle-sound":
      toggleSound();
      break;
    case "dismiss-warning":
      storageWarning = null;
      render();
      break;
    case "back":
      if (screen === "review") {
        screen = "lessons";
        render();
      }
      break;
    case "review-previous":
      reviewIndex = Math.max(0, reviewIndex - 1);
      render();
      break;
    case "review-next": {
      const lesson = activeLesson();
      if (reviewIndex >= lesson.conceptIds.length - 1) {
        startRun();
      } else {
        reviewIndex += 1;
        render();
      }
      break;
    }
    case "speak-current":
      speak(currentConcept());
      break;
    case "start-run":
      startRun();
      break;
    case "replay":
      startRun(true);
      break;
    case "back-to-lessons":
      updateState({ ...state, activeRun: null, activeLessonId: null });
      screen = "lessons";
      render();
      break;
    case "export-metrics":
      exportMetrics();
      break;
    case "reset-metrics":
      if (
        window.confirm(
          "Стерти весь локальний прогрес і метрики цього браузера?",
        )
      ) {
        const warning = clearState();
        if (warning === null) {
          storageWriteBlocked = false;
          window.location.reload();
        } else {
          storageWarning = warning;
          render();
        }
      }
      break;
  }
}

function bindInteractions(): void {
  root.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => {
    const action = element.dataset.action;
    if (!action || action === "hold-parent-gate") {
      return;
    }
    element.addEventListener("click", () => handleAction(action));
  });

  root.querySelectorAll<HTMLButtonElement>("[data-lesson-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const lessonId = button.dataset.lessonId;
      if (lessonId) {
        openLesson(lessonId);
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-side]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const side = button.dataset.side;
      if (side === "left" || side === "right") {
        answer(side);
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-rating]").forEach((button) => {
    button.addEventListener("click", () => {
      const rating = Number(button.dataset.rating);
      const run = state.activeRun;
      if (!run || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return;
      }
      appendEvent("enjoyment_rated", {
        runId: run.id,
        lessonId: run.lessonId,
        rating,
      });
      persist();
      render();
    });
  });

  const holdButton = root.querySelector<HTMLButtonElement>(
    '[data-action="hold-parent-gate"]',
  );
  if (holdButton) {
    holdButton.addEventListener("pointerdown", () => beginParentHold(holdButton));
    holdButton.addEventListener("pointerup", () => cancelParentHold(holdButton));
    holdButton.addEventListener("pointercancel", () =>
      cancelParentHold(holdButton),
    );
    holdButton.addEventListener("pointerleave", () =>
      cancelParentHold(holdButton),
    );
    holdButton.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        beginParentHold(holdButton);
      }
    });
    holdButton.addEventListener("keyup", () => cancelParentHold(holdButton));
  }

  const stage = root.querySelector<HTMLElement>("[data-testid='game-stage']");
  if (stage) {
    stage.addEventListener("pointerdown", (event) => {
      pointerStart = { x: event.clientX, y: event.clientY };
    });
    stage.addEventListener("pointerup", (event) => {
      if (!pointerStart || (event.target as HTMLElement).closest("button")) {
        pointerStart = null;
        return;
      }
      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(deltaX) >= 36 && Math.abs(deltaX) > Math.abs(deltaY)) {
        answer(deltaX < 0 ? "left" : "right");
        return;
      }
      if (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
        return;
      }
      const bounds = stage.getBoundingClientRect();
      answer(event.clientX < bounds.left + bounds.width / 2 ? "left" : "right");
    });
    stage.addEventListener("pointercancel", () => {
      pointerStart = null;
    });
  }
}

document.addEventListener("keydown", (event) => {
  if (screen !== "run" || event.repeat) {
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    answer("left");
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    answer("right");
  }
});

window.addEventListener("beforeunload", () => {
  if (canSpeak) {
    window.speechSynthesis.cancel();
  }
});

render();
