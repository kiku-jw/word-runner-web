import { describe, expect, it } from "vitest";

import { selectPreferredEnglishVoice, type VoiceCandidate } from "./speech";

function voice(
  name: string,
  options: Partial<VoiceCandidate> = {},
): VoiceCandidate {
  return {
    default: false,
    lang: "en-US",
    localService: true,
    name,
    voiceURI: name,
    ...options,
  };
}

describe("selectPreferredEnglishVoice", () => {
  it("prefers a natural Apple voice over a rough default voice", () => {
    const ralph = voice("Ralph", { default: true });
    const samantha = voice("Samantha", {
      voiceURI: "com.apple.speech.synthesis.voice.samantha",
    });

    expect(selectPreferredEnglishVoice([ralph, samantha])).toBe(samantha);
  });

  it("prefers enhanced Apple voices when available", () => {
    const samantha = voice("Samantha");
    const ava = voice("Ava (Enhanced)", {
      voiceURI: "com.apple.voice.enhanced.en-US.Ava",
    });

    expect(selectPreferredEnglishVoice([samantha, ava])).toBe(ava);
  });

  it("keeps a local English voice ahead of a remote branded voice", () => {
    const local = voice("English United States");
    const remote = voice("Samantha", { localService: false });

    expect(selectPreferredEnglishVoice([remote, local])).toBe(local);
  });

  it("does not deliberately select novelty or non-English voices", () => {
    expect(selectPreferredEnglishVoice([voice("Whisper")])).toBeNull();
    expect(
      selectPreferredEnglishVoice([
        voice("Anna", { lang: "de-DE" }),
        voice("Milena", { lang: "ru-RU" }),
      ]),
    ).toBeNull();
  });
});
