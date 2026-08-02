import { expect, type Download, type Page } from "@playwright/test";

const STORAGE_KEY = "word-runner-pilot-v1";

type StoredRunState = {
  currentIndex: number;
  status: "active" | "complete";
  questions: Array<{
    conceptId?: string;
    correctSide: "left" | "right";
    selectedSide?: "left" | "right" | null;
  }>;
};

type StoredPilotState = {
  noticeConfirmed: boolean;
  activeLessonId: string | null;
  activeRun: StoredRunState | null;
  reviewedLessonIds: string[];
  conceptProgress: Record<string, unknown>;
  eventLog: Array<{
    type: string;
    inputMethod?: string | null;
    selectedSide?: "left" | "right" | null;
    fps?: number | null;
    drawCalls?: number | null;
    pixelRatio?: number | null;
    difficulty?: number | null;
  }>;
};

export async function gotoApp(
  page: Page,
  options: {
    speechAlreadyMocked?: boolean;
    disableWebgl?: boolean;
    realQuestionTimeout?: boolean;
  } = {},
): Promise<void> {
  if (!options.realQuestionTimeout) {
    await page.addInitScript(() => {
      // Keep legacy interaction tests deterministic; the timeout acceptance
      // test explicitly opts into the real Easy/Medium/Hard deadlines.
      const nativeSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = ((
        handler: TimerHandler,
        timeout = 0,
        ...args: unknown[]
      ) =>
        nativeSetTimeout(
          handler,
          timeout === 8_000 || timeout === 9_000 || timeout === 10_000
            ? 60_000
            : timeout,
          ...args,
        )) as typeof window.setTimeout;
    });
  }
  if (options.disableWebgl) {
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        configurable: true,
        value(
          this: HTMLCanvasElement,
          contextId: string,
          ...args: unknown[]
        ): RenderingContext | null {
          if (contextId === "webgl2") {
            return null;
          }
          return Reflect.apply(originalGetContext, this, [contextId, ...args]);
        },
      });
    });
  }
  if (!options.speechAlreadyMocked) {
    await page.addInitScript(() => {
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          cancel: () => undefined,
          getVoices: () => [],
          speak: () => undefined,
        },
      });
    });
  }
  await page.addInitScript(() => {
    const musicAudioInstances: MockMusicAudio[] = [];
    class MockMusicAudio extends EventTarget {
      currentTime = 0;
      duration = 120;
      paused = true;
      preload = "";
      src = "";
      volume = 1;

      constructor() {
        super();
        musicAudioInstances.push(this);
      }

      load(): void {}

      pause(): void {
        this.paused = true;
      }

      play(): Promise<void> {
        this.paused = false;
        return Promise.resolve();
      }
    }
    Object.defineProperty(window, "Audio", {
      configurable: true,
      value: MockMusicAudio,
    });
    Object.defineProperty(window, "__musicAudioHarness", {
      configurable: true,
      value: {
        finish(): void {
          const audio = musicAudioInstances.at(-1);
          if (!audio) {
            return;
          }
          audio.currentTime = audio.duration;
          audio.paused = true;
          audio.dispatchEvent(new Event("ended"));
        },
      },
    });

    let mistakeToneStarts = 0;
    class SilentAudioParam {
      setValueAtTime(): this {
        return this;
      }

      exponentialRampToValueAtTime(): this {
        return this;
      }
    }
    class SilentAudioNode {
      connect(): void {}
      disconnect(): void {}
    }
    class SilentOscillator extends SilentAudioNode {
      type: OscillatorType = "sine";
      frequency = new SilentAudioParam();
      private onEnded: (() => void) | null = null;

      start(): void {
        mistakeToneStarts += 1;
      }
      stop(): void {
        window.queueMicrotask(() => this.onEnded?.());
      }
      addEventListener(type: string, listener: EventListener): void {
        if (type === "ended") {
          this.onEnded = () => listener(new Event("ended"));
        }
      }
    }
    class SilentGain extends SilentAudioNode {
      gain = new SilentAudioParam();
    }
    class SilentAudioContext {
      currentTime = 0;
      destination = new SilentAudioNode();
      state = "running";

      createOscillator(): SilentOscillator {
        return new SilentOscillator();
      }
      createGain(): SilentGain {
        return new SilentGain();
      }
      resume(): Promise<void> {
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: SilentAudioContext,
    });
    Object.defineProperty(window, "__mistakeToneStarts", {
      configurable: true,
      get: () => mistakeToneStarts,
    });
  });
  await page.goto("./");
  expect(new URL(page.url()).pathname).toBe("/word-runner-web/");
  await expect(page.getByRole("heading", { name: "Словобіг" })).toBeVisible();
}

export async function acceptNotice(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Обрати набір" }).click();
  await expect(page.getByRole("heading", { name: "Куди біжимо?" })).toBeVisible();
}

export async function openLesson(page: Page, lessonName: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(lessonName) }).click();
}

export async function finishReview(page: Page): Promise<void> {
  for (let index = 0; index < 5; index += 1) {
    await page.locator('[data-action="review-next"]').click();
  }
  await page.locator('[data-action="review-next"]').click();
  await expect(page.getByTestId("game-stage")).toBeVisible();
}

export async function readPilotState(page: Page): Promise<StoredPilotState> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      throw new Error(`Missing localStorage state for ${key}`);
    }
    return JSON.parse(raw) as StoredPilotState;
  }, STORAGE_KEY);
}

export async function answerCurrentQuestion(page: Page): Promise<void> {
  const answered = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      throw new Error(`Missing localStorage state for ${key}`);
    }
    const run = (JSON.parse(raw) as StoredPilotState).activeRun;
    if (!run) {
      throw new Error("Active run is missing.");
    }
    const question = run.questions[run.currentIndex];
    if (!question) {
      throw new Error(`Question ${run.currentIndex} is missing.`);
    }
    const button = document.querySelector<HTMLButtonElement>(
      `[data-side="${question.correctSide}"]`,
    );
    if (!button || button.disabled) {
      throw new Error(`Question ${run.currentIndex} is not answerable.`);
    }
    button.click();
    return {
      currentIndex: run.currentIndex,
      questionCount: run.questions.length,
    };
  }, STORAGE_KEY);

  if (answered.currentIndex === answered.questionCount - 1) {
    await expect(page.getByRole("heading", { name: "Забіг завершено" })).toBeVisible();
    return;
  }

  await expect
    .poll(async () => {
      const state = await readPilotState(page);
      return state.activeRun?.currentIndex ?? -1;
    }, { timeout: 15_000 })
    .toBe(answered.currentIndex + 1);
}

export async function completeRun(page: Page): Promise<void> {
  for (let index = 0; index < 10; index += 1) {
    await answerCurrentQuestion(page);
  }
  await expect(page.getByRole("heading", { name: "Забіг завершено" })).toBeVisible();
}

export async function openParentMetrics(page: Page): Promise<void> {
  const holdButton = page.locator('[data-action="hold-parent-gate"]');
  if (!(await holdButton.isVisible())) {
    const entryButton = page
      .getByRole("button", { name: /доросл/i })
      .filter({ hasNot: page.getByRole("heading", { name: "Метрики пілоту" }) });
    await entryButton.click();
    await expect(holdButton).toBeVisible();
  }
  const box = await holdButton.boundingBox();
  if (!box) {
    throw new Error("Parent hold button has no bounding box.");
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2100);
  await expect(page.getByRole("heading", { name: "Метрики пілоту" })).toBeVisible();
  await page.mouse.up();
}

export async function expectDownloadedJson(download: Download): Promise<string> {
  const path = await download.path();
  expect(path).not.toBeNull();
  const contents = await download.createReadStream();
  if (!contents) {
    throw new Error("Download stream is unavailable.");
  }
  const chunks: Buffer[] = [];
  for await (const chunk of contents) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return {
      rootClient: root.clientWidth,
      rootScroll: root.scrollWidth,
      bodyClient: body.clientWidth,
      bodyScroll: body.scrollWidth,
    };
  });

  expect(widths.rootScroll).toBeLessThanOrEqual(widths.rootClient);
  expect(widths.bodyScroll).toBeLessThanOrEqual(widths.bodyClient);
}
