export type Side = "left" | "right";
export type InputMethod = "tap" | "swipe" | "keyboard";
export type QuestionOrigin = "base" | "repeat" | "correction";
export type Difficulty = 1 | 2 | 3;

export interface Concept {
  id: string;
  source: { uk: string };
  target: { en: string };
  glyph: string;
  category: string;
  difficulty: Difficulty;
  distractorIds: readonly string[];
  reviewStatus: "prototype" | "approved";
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  glyph: string;
  difficulty: Difficulty;
  conceptIds: readonly [string, string, string, string, string, string];
}

export interface ContentPack {
  schemaVersion: 1;
  id: string;
  title: string;
  sourceLocale: "uk";
  targetLocale: "en";
  concepts: readonly Concept[];
  lessons: readonly Lesson[];
}

export interface RunQuestion {
  id: string;
  conceptId: string;
  distractorId: string;
  correctSide: Side;
  selectedSide: Side | null;
  origin: QuestionOrigin;
}

export interface RunState {
  schemaVersion: 1;
  id: string;
  lessonId: string;
  seed: number;
  startedAt: string;
  currentIndex: number;
  correctCount: number;
  status: "active" | "complete";
  questions: RunQuestion[];
  priorityNextRun: string[];
}

export interface ConceptProgress {
  attempts: number;
  correct: number;
  errors: number;
  lastSeenAt: string | null;
  prioritizeNextRun: boolean;
}

export type PilotEventType =
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

export interface PilotEvent {
  schemaVersion: 1;
  id: string;
  type: PilotEventType;
  timestamp: string;
  participantId: string;
  sessionId: string;
  runId: string | null;
  lessonId: string | null;
  conceptId: string | null;
  selectedSide: Side | null;
  correct: boolean | null;
  rating: number | null;
  difficulty?: Difficulty | null;
  inputMethod?: InputMethod | null;
  fps?: number | null;
  drawCalls?: number | null;
  pixelRatio?: number | null;
}

export interface PilotState {
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
