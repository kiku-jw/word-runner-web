import type {
  ConceptProgress,
  Difficulty,
  InputMethod,
  PilotEvent,
  PilotEventType,
  PilotState,
  RunState,
  Side,
} from "./types";

export interface EventDetails {
  runId?: string;
  lessonId?: string;
  conceptId?: string;
  selectedSide?: Side;
  correct?: boolean;
  rating?: number;
  inputMethod?: InputMethod;
  fps?: number;
  drawCalls?: number;
  pixelRatio?: number;
  difficulty?: Difficulty;
}

export function createPilotEvent(
  state: PilotState,
  sessionId: string,
  type: PilotEventType,
  details: EventDetails = {},
  timestamp = new Date().toISOString(),
): PilotEvent {
  return {
    schemaVersion: 1,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${timestamp}-${Math.random().toString(16).slice(2)}`,
    type,
    timestamp,
    participantId: state.participantId,
    sessionId,
    runId: details.runId ?? null,
    lessonId: details.lessonId ?? null,
    conceptId: details.conceptId ?? null,
    selectedSide: details.selectedSide ?? null,
    correct: details.correct ?? null,
    rating: details.rating ?? null,
    difficulty: details.difficulty ?? null,
    inputMethod: details.inputMethod ?? null,
    fps: details.fps ?? null,
    drawCalls: details.drawCalls ?? null,
    pixelRatio: details.pixelRatio ?? null,
  };
}

export function recordAnswerProgress(
  progress: Record<string, ConceptProgress>,
  run: RunState,
  correct: boolean,
  timestamp = new Date().toISOString(),
): Record<string, ConceptProgress> {
  const question = run.questions[run.currentIndex];
  if (!question) {
    return progress;
  }
  const previous = progress[question.conceptId] ?? {
    attempts: 0,
    correct: 0,
    errors: 0,
    lastSeenAt: null,
    prioritizeNextRun: false,
  };
  return {
    ...progress,
    [question.conceptId]: {
      attempts: previous.attempts + 1,
      correct: previous.correct + (correct ? 1 : 0),
      errors: previous.errors + (correct ? 0 : 1),
      lastSeenAt: timestamp,
      prioritizeNextRun: !correct,
    },
  };
}

export interface MetricSummary {
  sessions: number;
  runs: number;
  answers: number;
  correctAnswers: number;
  accuracyPercent: number;
  replays: number;
  returnSessions: number;
  averageEnjoyment: number | null;
  lastActivityAt: string | null;
  runsStarted: number;
  laneInputs: number;
  medianFps: number | null;
  runsByDifficulty: Record<Difficulty, number>;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) {
    return null;
  }
  if (sorted.length % 2 === 1) {
    return upper;
  }
  const lower = sorted[middle - 1] ?? upper;
  return Math.round((lower + upper) / 2);
}

export function summarizeMetrics(events: readonly PilotEvent[]): MetricSummary {
  const sessionEvents = events.filter(
    (event) => event.type === "session_started",
  );
  const sessionIds = new Set(sessionEvents.map((event) => event.sessionId));
  const answerEvents = events.filter(
    (event) => event.type === "answer_selected",
  );
  const correctAnswers = answerEvents.filter(
    (event) => event.correct === true,
  ).length;
  const ratings = events
    .filter((event) => event.type === "enjoyment_rated")
    .map((event) => event.rating)
    .filter((rating): rating is number => rating !== null);
  const fpsSamples = events
    .filter((event) => event.type === "render_sampled")
    .map((event) => event.fps)
    .filter((fps): fps is number => typeof fps === "number" && fps > 0);
  const firstSessionAt = sessionEvents[0]?.timestamp;
  const firstSessionMs = firstSessionAt ? Date.parse(firstSessionAt) : null;
  const returnSessions =
    firstSessionMs === null
      ? 0
      : sessionEvents.filter((event) => {
          return Date.parse(event.timestamp) - firstSessionMs >= 12 * 60 * 60_000;
        }).length;

  return {
    sessions: sessionIds.size,
    runs: events.filter((event) => event.type === "run_completed").length,
    answers: answerEvents.length,
    correctAnswers,
    accuracyPercent:
      answerEvents.length === 0
        ? 0
        : Math.round((correctAnswers / answerEvents.length) * 100),
    replays: events.filter((event) => event.type === "replay_started").length,
    returnSessions,
    averageEnjoyment:
      ratings.length === 0
        ? null
        : Math.round(
            (ratings.reduce((total, rating) => total + rating, 0) /
              ratings.length) *
              10,
          ) / 10,
    lastActivityAt: events.at(-1)?.timestamp ?? null,
    runsStarted: events.filter((event) => event.type === "run_started").length,
    laneInputs: events.filter((event) => event.type === "lane_selected").length,
    medianFps: median(fpsSamples),
    runsByDifficulty: {
      1: events.filter(
        (event) => event.type === "run_completed" && event.difficulty === 1,
      ).length,
      2: events.filter(
        (event) => event.type === "run_completed" && event.difficulty === 2,
      ).length,
      3: events.filter(
        (event) => event.type === "run_completed" && event.difficulty === 3,
      ).length,
    },
  };
}
