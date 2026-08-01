export type VoiceCandidate = Pick<
  SpeechSynthesisVoice,
  "default" | "lang" | "localService" | "name" | "voiceURI"
>;

const PREFERRED_NAME_SCORES: ReadonlyArray<readonly [string, number]> = [
  ["siri", 580],
  ["ava", 560],
  ["samantha", 550],
  ["allison", 540],
  ["zoe", 530],
  ["alex", 520],
  ["susan", 510],
  ["tom", 500],
  ["google us english", 450],
  ["microsoft aria", 440],
  ["microsoft jenny", 430],
  ["microsoft guy", 420],
  ["microsoft zira", 410],
];

const NOVELTY_VOICE_PATTERN =
  /\b(albert|bahh|bells|boing|bubbles|cellos|fred|jester|junior|kathy|organ|ralph|superstar|trinoids|whisper|wobble|zarvox)\b/i;

function voiceScore(voice: VoiceCandidate): number {
  const locale = voice.lang.replace("_", "-").toLowerCase();
  if (locale !== "en" && !locale.startsWith("en-")) {
    return Number.NEGATIVE_INFINITY;
  }

  const searchableName = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  let score = voice.localService ? 1_000 : 0;
  score += locale === "en-us" ? 120 : locale.startsWith("en-us-") ? 110 : 60;
  score += voice.default ? 20 : 0;
  score += searchableName.includes("com.apple") ? 100 : 0;

  if (/\b(premium|enhanced|natural|neural)\b/i.test(searchableName)) {
    score += 600;
  }
  for (const [name, nameScore] of PREFERRED_NAME_SCORES) {
    if (searchableName.includes(name)) {
      score += nameScore;
      break;
    }
  }
  if (NOVELTY_VOICE_PATTERN.test(searchableName)) {
    score -= 2_000;
  }
  return score;
}

export function selectPreferredEnglishVoice<T extends VoiceCandidate>(
  voices: readonly T[],
): T | null {
  let selected: T | null = null;
  let selectedScore = 0;
  for (const voice of voices) {
    const score = voiceScore(voice);
    if (score > selectedScore) {
      selected = voice;
      selectedScore = score;
    }
  }
  return selected;
}
