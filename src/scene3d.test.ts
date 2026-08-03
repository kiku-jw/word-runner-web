import { describe, expect, it } from "vitest";

import {
  backgroundGagQuestionIndex,
  baseWorldSpeedForDifficulty,
  cappedPixelRatio,
  fittedLabelFontSize,
  incorrectReactionForQuestionId,
} from "./scene3d";

describe("cappedPixelRatio", () => {
  it("caps compact viewports more aggressively for mobile GPUs", () => {
    expect(cappedPixelRatio(3, true)).toBe(1.25);
    expect(cappedPixelRatio(3, false)).toBe(1.5);
  });

  it("normalizes missing and sub-one ratios", () => {
    expect(cappedPixelRatio(Number.NaN, true)).toBe(1);
    expect(cappedPixelRatio(0.5, false)).toBe(1);
  });
});

describe("baseWorldSpeedForDifficulty", () => {
  it("raises the visual pace by level without changing reduced-motion speed", () => {
    expect(baseWorldSpeedForDifficulty(1, false)).toBeLessThan(
      baseWorldSpeedForDifficulty(2, false),
    );
    expect(baseWorldSpeedForDifficulty(2, false)).toBeLessThan(
      baseWorldSpeedForDifficulty(3, false),
    );
    expect(baseWorldSpeedForDifficulty(1, true)).toBe(
      baseWorldSpeedForDifficulty(3, true),
    );
  });
});

describe("fittedLabelFontSize", () => {
  it("keeps short labels large and scales long labels to the texture width", () => {
    expect(fittedLabelFontSize(450)).toBe(236);
    expect(fittedLabelFontSize(1_800)).toBe(118);
    expect(fittedLabelFontSize(10_000)).toBeLessThan(24);
  });
});

describe("incorrectReactionForQuestionId", () => {
  it("stays deterministic for a given question id", () => {
    expect(incorrectReactionForQuestionId("seed-1-dog-base")).toBe(
      incorrectReactionForQuestionId("seed-1-dog-base"),
    );
  });

  it("covers all three playful wrong-answer variants", () => {
    const reactions = new Set(
      [
        "seed-1-dog-base",
        "seed-2-cat-base",
        "seed-3-bird-base",
        "seed-4-cow-base",
        "seed-5-pig-base",
        "seed-6-horse-base",
      ].map((id) => incorrectReactionForQuestionId(id)),
    );

    expect(reactions).toEqual(new Set(["stumble", "backpack", "gate"]));
  });
});

describe("backgroundGagQuestionIndex", () => {
  it("schedules exactly one mid-run gag slot", () => {
    expect(backgroundGagQuestionIndex(0)).toBeGreaterThanOrEqual(2);
    expect(backgroundGagQuestionIndex(0)).toBeLessThanOrEqual(6);
    expect(backgroundGagQuestionIndex(0xdeadbeef)).toBeGreaterThanOrEqual(2);
    expect(backgroundGagQuestionIndex(0xdeadbeef)).toBeLessThanOrEqual(6);
  });

  it("stays deterministic for a run seed", () => {
    expect(backgroundGagQuestionIndex(123456)).toBe(
      backgroundGagQuestionIndex(123456),
    );
  });
});
