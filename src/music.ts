export const BACKGROUND_MUSIC_VOLUME = 0.2;
export const BACKGROUND_MUSIC_TRACKS = [
  "bouncy-block-adventure-1.mp3",
  "bouncy-block-adventure-2.mp3",
  "bouncy-block-adventure-3.mp3",
  "marble-dash-parade.mp3",
] as const;

const FADE_IN_MS = 2_400;
const FADE_OUT_SECONDS = 3.2;
const DUCKED_VOLUME_FACTOR = 0.4;

export interface BackgroundMusicSnapshot {
  enabled: boolean;
  started: boolean;
  playing: boolean;
  currentTrack: string | null;
  queuedTracks: string[];
  volume: number;
  targetVolume: number;
  pageVisible: boolean;
}

export interface BackgroundMusicController {
  start(): void;
  setEnabled(enabled: boolean): void;
  setDucked(ducked: boolean): void;
  setPageVisible(visible: boolean): void;
  snapshot(): BackgroundMusicSnapshot;
  dispose(): void;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function shuffleTrackOrder(
  tracks: readonly string[],
  previousTrack: string | null,
  random: () => number = Math.random,
): string[] {
  const order = [...tracks];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(index, Math.floor(random() * (index + 1)));
    [order[index], order[swapIndex]] = [order[swapIndex]!, order[index]!];
  }
  if (order.length > 1 && order[0] === previousTrack) {
    [order[0], order[1]] = [order[1]!, order[0]!];
  }
  return order;
}

export function calculateBackgroundMusicVolume(
  currentTime: number,
  duration: number,
  fadeElapsedMs: number,
  ducked = false,
): number {
  const fadeIn = clamp(fadeElapsedMs / FADE_IN_MS);
  const fadeOut =
    Number.isFinite(duration) && duration > 0
      ? clamp((duration - currentTime) / FADE_OUT_SECONDS)
      : 1;
  const target =
    BACKGROUND_MUSIC_VOLUME * (ducked ? DUCKED_VOLUME_FACTOR : 1);
  return target * Math.min(fadeIn, fadeOut);
}

export function createBackgroundMusic(
  tracks: readonly string[],
): BackgroundMusicController | null {
  if (typeof Audio !== "function" || tracks.length === 0) {
    return null;
  }

  const audio = new Audio();
  audio.preload = "metadata";
  audio.volume = 0;
  let queue: string[] = [];
  let currentTrack: string | null = null;
  let previousTrack: string | null = null;
  let enabled = false;
  let started = false;
  let pageVisible = document.visibilityState !== "hidden";
  let ducked = false;
  let disposed = false;
  let fadeStartedAt = performance.now();
  let fadeTimer: number | null = null;

  const cancelFade = (): void => {
    if (fadeTimer !== null) {
      window.clearInterval(fadeTimer);
      fadeTimer = null;
    }
  };

  const updateFade = (): void => {
    if (disposed || audio.paused || !enabled || !pageVisible) {
      cancelFade();
      return;
    }
    audio.volume = calculateBackgroundMusicVolume(
      audio.currentTime,
      audio.duration,
      performance.now() - fadeStartedAt,
      ducked,
    );
  };

  const beginFade = (): void => {
    cancelFade();
    fadeStartedAt = performance.now();
    audio.volume = 0;
    fadeTimer = window.setInterval(updateFade, 50);
  };

  const playCurrent = (): void => {
    if (
      disposed ||
      !started ||
      !enabled ||
      !pageVisible ||
      currentTrack === null
    ) {
      return;
    }
    if (!audio.paused) {
      return;
    }
    beginFade();
    void audio.play().catch(() => {
      cancelFade();
      audio.volume = 0;
    });
  };

  const playNext = (): void => {
    if (disposed || !started || !enabled || !pageVisible) {
      return;
    }
    if (queue.length === 0) {
      queue = shuffleTrackOrder(tracks, previousTrack);
    }
    const nextTrack = queue.shift();
    if (!nextTrack) {
      return;
    }
    currentTrack = nextTrack;
    audio.src = nextTrack;
    audio.currentTime = 0;
    audio.load();
    playCurrent();
  };

  const handleEnded = (): void => {
    previousTrack = currentTrack;
    currentTrack = null;
    cancelFade();
    playNext();
  };

  const handleError = (): void => {
    previousTrack = currentTrack;
    currentTrack = null;
    cancelFade();
    if (queue.length === 0) {
      started = false;
      return;
    }
    playNext();
  };

  audio.addEventListener("ended", handleEnded);
  audio.addEventListener("error", handleError);

  return {
    start(): void {
      if (disposed) {
        return;
      }
      started = true;
      if (currentTrack === null) {
        playNext();
      } else {
        playCurrent();
      }
    },
    setEnabled(nextEnabled: boolean): void {
      enabled = nextEnabled;
      if (!enabled) {
        cancelFade();
        audio.volume = 0;
        audio.pause();
      } else if (started) {
        playCurrent();
      }
    },
    setDucked(nextDucked: boolean): void {
      ducked = nextDucked;
    },
    setPageVisible(visible: boolean): void {
      pageVisible = visible;
      if (!pageVisible) {
        cancelFade();
        audio.volume = 0;
        audio.pause();
      } else if (started && enabled) {
        playCurrent();
      }
    },
    snapshot(): BackgroundMusicSnapshot {
      return {
        enabled,
        started,
        playing: !audio.paused,
        currentTrack,
        queuedTracks: [...queue],
        volume: Math.round(audio.volume * 1_000) / 1_000,
        targetVolume: BACKGROUND_MUSIC_VOLUME,
        pageVisible,
      };
    },
    dispose(): void {
      disposed = true;
      cancelFade();
      audio.pause();
      audio.volume = 0;
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    },
  };
}
