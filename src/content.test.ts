import { describe, expect, it } from "vitest";

import { CONTENT_PACK } from "./content";
import { validateContentPack } from "./engine";
import type { ContentPack } from "./types";

function clonePack(overrides?: Partial<ContentPack>): ContentPack {
  return {
    ...CONTENT_PACK,
    concepts: CONTENT_PACK.concepts.map((concept) => ({
      ...concept,
      source: { ...concept.source },
      target: { ...concept.target },
      distractorIds: [...concept.distractorIds],
    })),
    lessons: CONTENT_PACK.lessons.map((lesson) => ({
      ...lesson,
      conceptIds: [...lesson.conceptIds] as typeof lesson.conceptIds,
    })),
    ...overrides,
  };
}

describe("validateContentPack", () => {
  it("accepts the shipped pilot pack", () => {
    expect(validateContentPack(CONTENT_PACK)).toEqual([]);
  });

  it("rejects duplicate concept ids", () => {
    const pack = clonePack();
    pack.concepts = pack.concepts.map((concept, index) =>
      index === 1 ? { ...concept, id: pack.concepts[0]!.id } : concept,
    );

    expect(validateContentPack(pack)).toContain("Duplicate concept id: dog");
  });

  it("rejects lesson references to unknown concepts", () => {
    const pack = clonePack();
    pack.lessons = pack.lessons.map((lesson, index) =>
      index === 0
        ? {
            ...lesson,
            conceptIds: [
              "dog",
              "cat",
              "horse",
              "cow",
              "pig",
              "dragon",
            ] as typeof lesson.conceptIds,
          }
        : lesson,
    );

    expect(validateContentPack(pack)).toContain(
      "Lesson animals references unknown dragon.",
    );
  });

  it("rejects distractors outside the concept lesson", () => {
    const pack = clonePack();
    pack.concepts = pack.concepts.map((concept) =>
      concept.id === "dog"
        ? { ...concept, distractorIds: ["apple", ...concept.distractorIds.slice(1)] }
        : concept,
    );

    expect(validateContentPack(pack)).toContain(
      "Distractor apple for dog is outside its lesson.",
    );
  });
});
