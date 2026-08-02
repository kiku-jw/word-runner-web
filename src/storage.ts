import { CONTENT_PACK } from "./content";
import type {
  ConceptProgress,
  InputMethod,
  PilotEvent,
  PilotEventType,
  PilotState,
  RunQuestion,
  RunState,
  Side,
} from "./types";

export const STORAGE_KEY = "word-runner-pilot-v1";

const LESSON_CONCEPT_IDS = new Map(
  CONTENT_PACK.lessons.map((lesson) => [
    lesson.id,
    new Set<string>(lesson.conceptIds),
  ]),
);

function participantId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createDefaultState(): PilotState {
  return {
    schemaVersion: 1,
    participantId: participantId(),
    noticeConfirmed: false,
    soundEnabled: true,
    activeLessonId: null,
    activeRun: null,
    reviewedLessonIds: [],
    conceptProgress: {},
    eventLog: [],
  };
}

export interface LoadResult {
  state: PilotState;
  warning: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isSide(value: unknown): value is Side {
  return value === "left" || value === "right";
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isFiniteRating(value: unknown): value is number | null {
  return (
    value === null ||
    (Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5)
  );
}

function isOptionalFiniteNumber(value: unknown): boolean {
  return value === undefined || value === null || Number.isFinite(value);
}

function isOptionalDifficulty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === 1 ||
    value === 2 ||
    value === 3
  );
}

function isOptionalInputMethod(value: unknown): value is InputMethod | null | undefined {
  return (
    value === undefined ||
    value === null ||
    value === "tap" ||
    value === "swipe" ||
    value === "keyboard"
  );
}

function isRunQuestion(value: unknown): value is RunQuestion {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.conceptId === "string" &&
    typeof value.distractorId === "string" &&
    isSide(value.correctSide) &&
    (value.selectedSide === null || isSide(value.selectedSide)) &&
    (value.origin === "base" ||
      value.origin === "repeat" ||
      value.origin === "correction")
  );
}

function isRunState(value: unknown): value is RunState {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.schemaVersion === 1 &&
    typeof value.id === "string" &&
    typeof value.lessonId === "string" &&
    isNonNegativeInteger(value.seed) &&
    typeof value.startedAt === "string" &&
    isNonNegativeInteger(value.currentIndex) &&
    isNonNegativeInteger(value.correctCount) &&
    (value.status === "active" || value.status === "complete") &&
    Array.isArray(value.questions) &&
    value.questions.length === 10 &&
    value.questions.every(isRunQuestion) &&
    ((value.status === "active" &&
      Number(value.currentIndex) < value.questions.length) ||
      (value.status === "complete" &&
        Number(value.currentIndex) === value.questions.length - 1)) &&
    Number(value.correctCount) <= value.questions.length &&
    Array.isArray(value.priorityNextRun) &&
    value.priorityNextRun.every((item) => typeof item === "string")
  );
}

function isConceptProgress(value: unknown): value is ConceptProgress {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isNonNegativeInteger(value.attempts) &&
    isNonNegativeInteger(value.correct) &&
    isNonNegativeInteger(value.errors) &&
    Number(value.correct) + Number(value.errors) === Number(value.attempts) &&
    isNullableString(value.lastSeenAt) &&
    typeof value.prioritizeNextRun === "boolean"
  );
}

const PILOT_EVENT_TYPES: ReadonlySet<PilotEventType> = new Set([
  "session_started",
  "session_resumed",
  "run_started",
  "question_shown",
  "lane_selected",
  "answer_selected",
  "render_sampled",
  "run_completed",
  "replay_started",
  "enjoyment_rated",
]);

function isPilotEvent(value: unknown): value is PilotEvent {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.schemaVersion === 1 &&
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    PILOT_EVENT_TYPES.has(value.type as PilotEventType) &&
    typeof value.timestamp === "string" &&
    typeof value.participantId === "string" &&
    typeof value.sessionId === "string" &&
    isNullableString(value.runId) &&
    isNullableString(value.lessonId) &&
    isNullableString(value.conceptId) &&
    (value.selectedSide === null || isSide(value.selectedSide)) &&
    (value.correct === null || typeof value.correct === "boolean") &&
    isFiniteRating(value.rating) &&
    isOptionalDifficulty(value.difficulty) &&
    isOptionalInputMethod(value.inputMethod) &&
    isOptionalFiniteNumber(value.fps) &&
    isOptionalFiniteNumber(value.drawCalls) &&
    isOptionalFiniteNumber(value.pixelRatio)
  );
}

function isConceptProgressMap(
  value: unknown,
): value is Record<string, ConceptProgress> {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([conceptId, progress]) =>
        conceptId.length > 0 && isConceptProgress(progress),
    )
  );
}

function hasKnownActiveContent(state: PilotState): boolean {
  if (
    state.activeLessonId !== null &&
    !LESSON_CONCEPT_IDS.has(state.activeLessonId)
  ) {
    return false;
  }
  if (state.activeRun === null) {
    return true;
  }
  const lessonConceptIds = LESSON_CONCEPT_IDS.get(state.activeRun.lessonId);
  return (
    lessonConceptIds !== undefined &&
    state.activeRun.questions.every(
      (question) =>
        lessonConceptIds.has(question.conceptId) &&
        lessonConceptIds.has(question.distractorId),
    )
  );
}

function looksLikePilotState(value: unknown): value is PilotState {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<PilotState>;
  const structurallyValid =
    candidate.schemaVersion === 1 &&
    typeof candidate.participantId === "string" &&
    typeof candidate.noticeConfirmed === "boolean" &&
    typeof candidate.soundEnabled === "boolean" &&
    isNullableString(candidate.activeLessonId) &&
    (candidate.activeRun === null || isRunState(candidate.activeRun)) &&
    Array.isArray(candidate.reviewedLessonIds) &&
    candidate.reviewedLessonIds.every((item) => typeof item === "string") &&
    isConceptProgressMap(candidate.conceptProgress) &&
    Array.isArray(candidate.eventLog) &&
    candidate.eventLog.every(isPilotEvent);
  return structurallyValid && hasKnownActiveContent(candidate as PilotState);
}

export function loadState(storage?: Storage): LoadResult {
  let raw: string | null;
  try {
    raw = (storage ?? localStorage).getItem(STORAGE_KEY);
  } catch {
    return {
      state: createDefaultState(),
      warning:
        "Не вдалося прочитати локальні дані. Прогрес цієї сесії не зберігатиметься.",
    };
  }
  if (raw === null) {
    return { state: createDefaultState(), warning: null };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!looksLikePilotState(parsed)) {
      return {
        state: createDefaultState(),
        warning:
          "Локальні дані мають невідомий формат. Їх не було перезаписано.",
      };
    }
    return { state: parsed, warning: null };
  } catch {
    return {
      state: createDefaultState(),
      warning:
        "Локальні дані пошкоджені. Їх не було перезаписано.",
    };
  }
}

export function saveState(
  state: PilotState,
  storage?: Storage,
): string | null {
  try {
    (storage ?? localStorage).setItem(STORAGE_KEY, JSON.stringify(state));
    return null;
  } catch {
    return "Не вдалося зберегти прогрес у цьому браузері.";
  }
}

export function clearState(storage?: Storage): string | null {
  try {
    (storage ?? localStorage).removeItem(STORAGE_KEY);
    return null;
  } catch {
    return "Не вдалося стерти локальні дані у цьому браузері.";
  }
}

export function serializePilotData(state: PilotState): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      participantId: state.participantId,
      conceptProgress: state.conceptProgress,
      events: state.eventLog,
    },
    null,
    2,
  );
}
