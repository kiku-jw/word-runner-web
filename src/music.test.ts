import { describe, expect, it } from "vitest";

import {
  BACKGROUND_MUSIC_VOLUME,
  calculateBackgroundMusicVolume,
  shuffleTrackOrder,
} from "./music";

describe("background music", () => {
  it("shuffles every track once and avoids the previous track first", () => {
    const tracks = ["one", "two", "three", "four"];
    const order = shuffleTrackOrder(tracks, "four", () => 0.999);

    expect(new Set(order)).toEqual(new Set(tracks));
    expect(order).toHaveLength(tracks.length);
    expect(order[0]).not.toBe("four");
  });

  it("fades around a 20 percent target volume", () => {
    expect(BACKGROUND_MUSIC_VOLUME).toBe(0.2);
    expect(calculateBackgroundMusicVolume(1.2, 120, 1_200)).toBeCloseTo(0.1);
    expect(calculateBackgroundMusicVolume(20, 120, 2_400)).toBeCloseTo(0.2);
    expect(calculateBackgroundMusicVolume(118.4, 120, 5_000)).toBeCloseTo(0.1);
    expect(calculateBackgroundMusicVolume(20, 120, 5_000, true)).toBeCloseTo(
      0.08,
    );
  });
});
