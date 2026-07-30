import { describe, expect, it } from "vitest";

import { CONTENT_PACK } from "./content";
import {
  ENGINE_RULES,
  answerCurrent,
  createRun,
  maxConsecutiveSide,
  optionsForQuestion,
} from "./engine";

function findSeedWithEarlyRequeue(lessonId: string): number {
  for (let seed = 0; seed < 5_000; seed += 1) {
    const run = createRun(CONTENT_PACK, lessonId, seed);
    const wrongSide = run.questions[0]!.correctSide === "left" ? "right" : "left";
    const result = answerCurrent(CONTENT_PACK, run, wrongSide);
    if (result.requeuedAt !== null) {
      return seed;
    }
  }
  throw new Error(`No requeue seed found for ${lessonId}.`);
}

describe("createRun", () => {
  it("creates ten valid questions across a deterministic seed sample", () => {
    for (const lesson of CONTENT_PACK.lessons) {
      const lessonConceptIds = new Set(lesson.conceptIds);

      for (let seed = 0; seed < 512; seed += 1) {
        const run = createRun(CONTENT_PACK, lesson.id, seed);

        expect(run.questions).toHaveLength(ENGINE_RULES.runLength);
        for (const question of run.questions.slice(0, ENGINE_RULES.baseConceptCount)) {
          expect(question.origin).toBe("base");
        }
        for (const question of run.questions.slice(ENGINE_RULES.baseConceptCount)) {
          expect(question.origin).toBe("repeat");
        }
        expect(
          new Set(run.questions.map((question) => question.conceptId)).size,
        ).toBe(ENGINE_RULES.baseConceptCount);
        expect(maxConsecutiveSide(run.questions)).toBeLessThanOrEqual(3);

        for (const question of run.questions) {
          expect(lessonConceptIds.has(question.conceptId)).toBe(true);
          expect(lessonConceptIds.has(question.distractorId)).toBe(true);
          expect(question.distractorId).not.toBe(question.conceptId);

          const options = optionsForQuestion(CONTENT_PACK, question);
          expect(options.left.id).not.toBe(options.right.id);
          expect([options.left.id, options.right.id]).toContain(question.conceptId);
          expect([options.left.id, options.right.id]).toContain(question.distractorId);
        }
      }
    }
  });

  it("requeues an early mistake two to four slots later when a repeat slot is available", () => {
    const seed = findSeedWithEarlyRequeue("animals");
    const run = createRun(CONTENT_PACK, "animals", seed);
    const wrongSide = run.questions[0]!.correctSide === "left" ? "right" : "left";
    const result = answerCurrent(CONTENT_PACK, run, wrongSide);

    expect(result.correct).toBe(false);
    expect(result.requeuedAt).toBeGreaterThanOrEqual(2);
    expect(result.requeuedAt).toBeLessThanOrEqual(4);

    const requeuedQuestion = result.run.questions[result.requeuedAt!];
    expect(requeuedQuestion).toMatchObject({
      conceptId: run.questions[0]!.conceptId,
      origin: "correction",
      selectedSide: null,
    });
  });

  it("keeps the three-side limit after corrections across a seed sample", () => {
    for (const lesson of CONTENT_PACK.lessons) {
      for (let seed = 0; seed < 512; seed += 1) {
        const run = createRun(CONTENT_PACK, lesson.id, seed);
        const wrongSide =
          run.questions[0]!.correctSide === "left" ? "right" : "left";
        const result = answerCurrent(CONTENT_PACK, run, wrongSide);

        expect(maxConsecutiveSide(result.run.questions)).toBeLessThanOrEqual(3);
      }
    }
  });

  it("carries mistakes from the last two questions into the next run priority queue", () => {
    const run = {
      ...createRun(CONTENT_PACK, "food", 23),
      currentIndex: 8,
    };
    const currentQuestion = run.questions[run.currentIndex]!;
    const wrongSide = currentQuestion.correctSide === "left" ? "right" : "left";
    const result = answerCurrent(CONTENT_PACK, run, wrongSide);

    expect(result.correct).toBe(false);
    expect(result.requeuedAt).toBeNull();
    expect(result.run.priorityNextRun).toEqual([currentQuestion.conceptId]);
  });

  it("schedules carried concepts first among the repeat questions of the next run", () => {
    const run = createRun(CONTENT_PACK, "nature", 99, ["river", "sun", "river", "dog"]);

    expect(run.questions.slice(6, 8).map((question) => question.conceptId)).toEqual([
      "river",
      "sun",
    ]);
  });
});
