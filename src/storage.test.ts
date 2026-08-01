import { describe, expect, it, vi } from "vitest";

import {
  STORAGE_KEY,
  createDefaultState,
  loadState,
  saveState,
} from "./storage";
import type { PilotState } from "./types";

function createStorage(seed: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(seed));

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.has(key) ? values.get(key)! : null;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

describe("loadState", () => {
  it("returns a default state when storage is empty", () => {
    const result = loadState(createStorage());

    expect(result.warning).toBeNull();
    expect(result.state.noticeConfirmed).toBe(false);
    expect(result.state.soundEnabled).toBe(true);
    expect(result.state.activeRun).toBeNull();
  });

  it("returns parsed pilot state when stored data is valid", () => {
    const state: PilotState = {
      ...createDefaultState(),
      participantId: "participant-1",
      noticeConfirmed: true,
      soundEnabled: false,
      reviewedLessonIds: ["animals"],
    };
    const storage = createStorage({
      [STORAGE_KEY]: JSON.stringify(state),
    });

    expect(loadState(storage)).toEqual({ state, warning: null });
  });

  it("returns a warning for malformed JSON without overwriting storage", () => {
    const storage = createStorage({
      [STORAGE_KEY]: "{not-json",
    });
    const setItemSpy = vi.spyOn(storage, "setItem");

    const result = loadState(storage);

    expect(result.warning).toBe("Локальні дані пошкоджені. Їх не було перезаписано.");
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(storage.getItem(STORAGE_KEY)).toBe("{not-json");
  });

  it("returns a warning for unknown state shapes without overwriting storage", () => {
    const storage = createStorage({
      [STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, noticeConfirmed: true }),
    });
    const setItemSpy = vi.spyOn(storage, "setItem");

    const result = loadState(storage);

    expect(result.warning).toBe(
      "Локальні дані мають невідомий формат. Їх не було перезаписано.",
    );
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("rejects nested activeRun data with an invalid question shape", () => {
    const state = createDefaultState();
    const storage = createStorage({
      [STORAGE_KEY]: JSON.stringify({
        ...state,
        activeRun: {
          schemaVersion: 1,
          id: "run-1",
          lessonId: "animals",
          seed: 1,
          startedAt: "2026-07-30T10:00:00.000Z",
          currentIndex: 0,
          correctCount: 0,
          status: "active",
          questions: [
            {
              id: "q-1",
              conceptId: "dog",
              distractorId: "cat",
              correctSide: "up",
              selectedSide: null,
              origin: "base",
            },
          ],
          priorityNextRun: [],
        },
      }),
    });

    expect(loadState(storage).warning).toBe(
      "Локальні дані мають невідомий формат. Їх не було перезаписано.",
    );
  });

  it("rejects nested metric events with invalid sides", () => {
    const state = createDefaultState();
    const storage = createStorage({
      [STORAGE_KEY]: JSON.stringify({
        ...state,
        eventLog: [
          {
            schemaVersion: 1,
            id: "event-1",
            type: "answer_selected",
            timestamp: "2026-07-30T10:00:00.000Z",
            participantId: "participant-1",
            sessionId: "session-1",
            runId: "run-1",
            lessonId: "animals",
            conceptId: "dog",
            selectedSide: "up",
            correct: true,
            rating: null,
          },
        ],
      }),
    });

    expect(loadState(storage).warning).toBe(
      "Локальні дані мають невідомий формат. Їх не було перезаписано.",
    );
  });

  it("accepts 3D performance events and rejects invalid input methods", () => {
    const state = createDefaultState();
    const validEvent = {
      schemaVersion: 1,
      id: "event-3d",
      type: "render_sampled",
      timestamp: "2026-08-01T08:00:00.000Z",
      participantId: state.participantId,
      sessionId: "session-1",
      runId: "run-1",
      lessonId: "animals",
      conceptId: null,
      selectedSide: null,
      correct: null,
      rating: null,
      inputMethod: null,
      fps: 58,
      drawCalls: 74,
      pixelRatio: 1.25,
    };
    const validStorage = createStorage({
      [STORAGE_KEY]: JSON.stringify({ ...state, eventLog: [validEvent] }),
    });

    expect(loadState(validStorage).warning).toBeNull();

    const invalidStorage = createStorage({
      [STORAGE_KEY]: JSON.stringify({
        ...state,
        eventLog: [{ ...validEvent, type: "lane_selected", inputMethod: "tilt" }],
      }),
    });
    expect(loadState(invalidStorage).warning).toBe(
      "Локальні дані мають невідомий формат. Їх не було перезаписано.",
    );
  });

  it("rejects nested concept progress with mismatched attempts and outcomes", () => {
    const state = createDefaultState();
    const storage = createStorage({
      [STORAGE_KEY]: JSON.stringify({
        ...state,
        conceptProgress: {
          dog: {
            attempts: 2,
            correct: 1,
            errors: 0,
            lastSeenAt: "2026-07-30T10:00:00.000Z",
            prioritizeNextRun: false,
          },
        },
      }),
    });

    expect(loadState(storage).warning).toBe(
      "Локальні дані мають невідомий формат. Їх не було перезаписано.",
    );
  });

  it("rejects an unknown active lesson id", () => {
    const state = createDefaultState();
    const storage = createStorage({
      [STORAGE_KEY]: JSON.stringify({
        ...state,
        activeLessonId: "ghost-lesson",
      }),
    });

    expect(loadState(storage).warning).toBe(
      "Локальні дані мають невідомий формат. Їх не було перезаписано.",
    );
  });

  it("rejects an active run that references unknown lesson content ids", () => {
    const state = createDefaultState();
    const storage = createStorage({
      [STORAGE_KEY]: JSON.stringify({
        ...state,
        activeLessonId: "animals",
        activeRun: {
          schemaVersion: 1,
          id: "run-1",
          lessonId: "animals",
          seed: 1,
          startedAt: "2026-07-30T10:00:00.000Z",
          currentIndex: 0,
          correctCount: 0,
          status: "active",
          questions: Array.from({ length: 10 }, (_, index) => ({
            id: `q-${index + 1}`,
            conceptId: index === 0 ? "dragon" : "dog",
            distractorId: "cat",
            correctSide: index % 2 === 0 ? "left" : "right",
            selectedSide: null,
            origin: index < 6 ? "base" : "repeat",
          })),
          priorityNextRun: [],
        },
      }),
    });

    expect(loadState(storage).warning).toBe(
      "Локальні дані мають невідомий формат. Їх не було перезаписано.",
    );
  });
});

describe("saveState", () => {
  it("persists pilot state into storage", () => {
    const state = createDefaultState();
    const storage = createStorage();

    expect(saveState(state, storage)).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(state));
  });
});
