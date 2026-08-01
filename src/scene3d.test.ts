import { describe, expect, it } from "vitest";

import { cappedPixelRatio } from "./scene3d";

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
