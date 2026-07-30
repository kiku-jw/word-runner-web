import { describe, expect, it } from "vitest";

import { summarizeMetrics } from "./metrics";
import type { PilotEvent } from "./types";

function event(overrides: Partial<PilotEvent>): PilotEvent {
  return {
    schemaVersion: 1,
    id: overrides.id ?? crypto.randomUUID(),
    type: overrides.type ?? "session_started",
    timestamp: overrides.timestamp ?? "2026-07-30T09:00:00.000Z",
    participantId: overrides.participantId ?? "participant-1",
    sessionId: overrides.sessionId ?? "session-1",
    runId: overrides.runId ?? null,
    lessonId: overrides.lessonId ?? null,
    conceptId: overrides.conceptId ?? null,
    selectedSide: overrides.selectedSide ?? null,
    correct: overrides.correct ?? null,
    rating: overrides.rating ?? null,
  };
}

describe("summarizeMetrics", () => {
  it("summarizes sessions, answers, replays, returns, and enjoyment ratings", () => {
    const events: PilotEvent[] = [
      event({ id: "e1", type: "session_started", timestamp: "2026-07-30T09:00:00.000Z" }),
      event({
        id: "e2",
        type: "answer_selected",
        timestamp: "2026-07-30T09:01:00.000Z",
        runId: "run-1",
        lessonId: "animals",
        conceptId: "dog",
        selectedSide: "left",
        correct: true,
      }),
      event({
        id: "e3",
        type: "answer_selected",
        timestamp: "2026-07-30T09:02:00.000Z",
        runId: "run-1",
        lessonId: "animals",
        conceptId: "cat",
        selectedSide: "right",
        correct: false,
      }),
      event({ id: "e4", type: "run_completed", timestamp: "2026-07-30T09:03:00.000Z", runId: "run-1" }),
      event({ id: "e5", type: "replay_started", timestamp: "2026-07-30T09:04:00.000Z", runId: "run-2" }),
      event({
        id: "e6",
        type: "enjoyment_rated",
        timestamp: "2026-07-30T09:05:00.000Z",
        runId: "run-1",
        rating: 4,
      }),
      event({
        id: "e7",
        type: "session_started",
        timestamp: "2026-07-30T22:00:00.000Z",
        sessionId: "session-2",
      }),
      event({
        id: "e8",
        type: "answer_selected",
        timestamp: "2026-07-30T22:01:00.000Z",
        sessionId: "session-2",
        runId: "run-3",
        lessonId: "food",
        conceptId: "apple",
        selectedSide: "left",
        correct: true,
      }),
      event({
        id: "e9",
        type: "enjoyment_rated",
        timestamp: "2026-07-30T22:02:00.000Z",
        sessionId: "session-2",
        runId: "run-3",
        rating: 5,
      }),
    ];

    expect(summarizeMetrics(events)).toEqual({
      sessions: 2,
      runs: 1,
      answers: 3,
      correctAnswers: 2,
      accuracyPercent: 67,
      replays: 1,
      returnSessions: 1,
      averageEnjoyment: 4.5,
      lastActivityAt: "2026-07-30T22:02:00.000Z",
    });
  });
});
