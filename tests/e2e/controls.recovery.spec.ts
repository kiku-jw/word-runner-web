import { expect, test, type Page } from "@playwright/test";

import {
  acceptNotice,
  finishReview,
  gotoApp,
  openLesson,
  readPilotState,
} from "./helpers";

function oppositeSide(side: "left" | "right"): "left" | "right" {
  return side === "left" ? "right" : "left";
}

async function swipeToSide(page: Page, side: "left" | "right"): Promise<void> {
  const stage = page.getByTestId("game-stage");
  const box = await stage.boundingBox();
  if (!box) {
    throw new Error("Game stage has no bounding box.");
  }
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height * 0.7;
  const endX = startX + (side === "left" ? -90 : 90);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, startY, { steps: 5 });
  await page.mouse.up();
}

async function waitForAdvance(page: Page, previousIndex: number): Promise<void> {
  await expect
    .poll(async () => {
      const state = await readPilotState(page);
      return state.activeRun?.currentIndex ?? -1;
    })
    .toBe(previousIndex + 1);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("supports tap answers on both left and right gates", async ({ page }) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Тварини");
  await finishReview(page);

  const seenSides = new Set<string>();
  while (seenSides.size < 2) {
    const state = await readPilotState(page);
    const run = state.activeRun;
    if (!run) {
      throw new Error("Active run is missing.");
    }
    const currentQuestion = run.questions[run.currentIndex];
    if (!currentQuestion) {
      throw new Error("Current question is missing.");
    }

    seenSides.add(currentQuestion.correctSide);
    await page.locator(`[data-side="${currentQuestion.correctSide}"]`).click();

    if (run.currentIndex < run.questions.length - 1) {
      await waitForAdvance(page, run.currentIndex);
    }
  }

  expect(seenSides).toEqual(new Set(["left", "right"]));
  const state = await readPilotState(page);
  expect(
    state.eventLog.filter((event) => event.type === "lane_selected").at(-1)
      ?.inputMethod,
  ).toBe("tap");
});

test("supports horizontal swipe answers on both left and right sides", async ({
  page,
}) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Їжа й напої");
  await finishReview(page);

  const seenSides = new Set<string>();
  while (seenSides.size < 2) {
    const state = await readPilotState(page);
    const run = state.activeRun;
    if (!run) {
      throw new Error("Active run is missing.");
    }
    const currentQuestion = run.questions[run.currentIndex];
    if (!currentQuestion) {
      throw new Error("Current question is missing.");
    }

    seenSides.add(currentQuestion.correctSide);
    await swipeToSide(page, currentQuestion.correctSide);

    if (run.currentIndex < run.questions.length - 1) {
      await waitForAdvance(page, run.currentIndex);
    }
  }

  expect(seenSides).toEqual(new Set(["left", "right"]));
  const state = await readPilotState(page);
  expect(
    state.eventLog.filter((event) => event.type === "lane_selected").at(-1)
      ?.inputMethod,
  ).toBe("swipe");
});

test("supports ArrowLeft and ArrowRight answers on both sides", async ({
  page,
}) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Транспорт");
  await finishReview(page);

  const seenSides = new Set<string>();
  while (seenSides.size < 2) {
    const state = await readPilotState(page);
    const run = state.activeRun;
    if (!run) {
      throw new Error("Active run is missing.");
    }
    const currentQuestion = run.questions[run.currentIndex];
    if (!currentQuestion) {
      throw new Error("Current question is missing.");
    }

    seenSides.add(currentQuestion.correctSide);
    await page.keyboard.press(
      currentQuestion.correctSide === "left" ? "ArrowLeft" : "ArrowRight",
    );

    if (run.currentIndex < run.questions.length - 1) {
      await waitForAdvance(page, run.currentIndex);
    }
  }

  expect(seenSides).toEqual(new Set(["left", "right"]));
  const state = await readPilotState(page);
  expect(
    state.eventLog.filter((event) => event.type === "lane_selected").at(-1)
      ?.inputMethod,
  ).toBe("keyboard");
});

test("locks input after the first answer and ignores a second control before feedback ends", async ({
  page,
}) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Природа");
  await finishReview(page);

  const before = await readPilotState(page);
  const run = before.activeRun;
  if (!run) {
    throw new Error("Active run is missing.");
  }
  const currentQuestion = run.questions[run.currentIndex];
  if (!currentQuestion) {
    throw new Error("Current question is missing.");
  }

  const firstSide = currentQuestion.correctSide;
  const secondSide = oppositeSide(firstSide);
  const answerEventsBefore = before.eventLog.filter(
    (event) => event.type === "answer_selected",
  ).length;

  await page.locator(`[data-side="${firstSide}"]`).evaluate(
    (button, key) => {
      (button as HTMLButtonElement).click();
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true }),
      );
    },
    secondSide === "left" ? "ArrowLeft" : "ArrowRight",
  );
  await expect(page.locator(`[data-side="${secondSide}"]`)).toBeDisabled();

  await waitForAdvance(page, run.currentIndex);

  const after = await readPilotState(page);
  const answerEventsAfter = after.eventLog.filter(
    (event) => event.type === "answer_selected",
  );
  expect(answerEventsAfter).toHaveLength(answerEventsBefore + 1);
  expect(run.questions[run.currentIndex]?.selectedSide).toBeNull();
  const answeredQuestion = after.activeRun?.questions[run.currentIndex];
  expect(answeredQuestion?.selectedSide).toBe(firstSide);
  expect(answerEventsAfter.at(-1)?.type).toBe("answer_selected");
});

test("ignores vertical drags without changing progress or recording an answer", async ({
  page,
}) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Природа");
  await finishReview(page);

  const before = await readPilotState(page);
  const beforeAnswers = before.eventLog.filter(
    (event) => event.type === "answer_selected",
  ).length;
  const stage = page.getByTestId("game-stage");
  const box = await stage.boundingBox();
  if (!box) {
    throw new Error("Game stage has no bounding box.");
  }

  const x = box.x + box.width / 2;
  const startY = box.y + box.height * 0.7;
  const endY = startY - 110;

  await page.mouse.move(x, startY);
  await page.mouse.down();
  await page.mouse.move(x + 4, endY, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(150);

  const after = await readPilotState(page);
  const afterAnswers = after.eventLog.filter(
    (event) => event.type === "answer_selected",
  ).length;
  expect(after.activeRun?.currentIndex).toBe(before.activeRun?.currentIndex);
  expect(afterAnswers).toBe(beforeAnswers);
  expect(page.getByText("1 / 10")).toBeVisible();
});

test("continues to the next question after reload during feedback", async ({
  page,
}) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Тварини");
  await finishReview(page);

  const before = await readPilotState(page);
  const run = before.activeRun;
  if (!run) {
    throw new Error("Active run is missing.");
  }
  const currentQuestion = run.questions[run.currentIndex];
  if (!currentQuestion) {
    throw new Error("Current question is missing.");
  }

  await page.locator(`[data-side="${currentQuestion.correctSide}"]`).click();
  await page.reload();

  await expect(page.getByTestId("game-stage")).toBeVisible();
  await expect(page.getByText("2 / 10")).toBeVisible();

  const after = await readPilotState(page);
  expect(after.activeRun?.currentIndex).toBe(1);
  expect(after.activeRun?.questions[0]?.selectedSide).toBe(currentQuestion.correctSide);
});

test("finishes the run after reload during final-question feedback", async ({
  page,
}) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Транспорт");
  await finishReview(page);

  for (let index = 0; index < 9; index += 1) {
    const state = await readPilotState(page);
    const run = state.activeRun;
    if (!run) {
      throw new Error("Active run is missing.");
    }
    const currentQuestion = run.questions[run.currentIndex];
    if (!currentQuestion) {
      throw new Error("Current question is missing.");
    }
    await page.locator(`[data-side="${currentQuestion.correctSide}"]`).click();
    await waitForAdvance(page, run.currentIndex);
  }

  const beforeFinal = await readPilotState(page);
  const finalRun = beforeFinal.activeRun;
  if (!finalRun) {
    throw new Error("Final run is missing.");
  }
  const finalQuestion = finalRun.questions[finalRun.currentIndex];
  if (!finalQuestion) {
    throw new Error("Final question is missing.");
  }

  await page.locator(`[data-side="${finalQuestion.correctSide}"]`).click();
  await page.reload();

  await expect(page.getByRole("heading", { name: "Забіг завершено" })).toBeVisible();
  const after = await readPilotState(page);
  expect(after.activeRun?.status).toBe("complete");
  expect(
    after.eventLog.some((event) => event.type === "run_completed"),
  ).toBe(true);
});

test("prioritizes a last-two mistake in the next non-replay run", async ({
  page,
}) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Їжа й напої");
  await finishReview(page);

  for (let index = 0; index < 8; index += 1) {
    const state = await readPilotState(page);
    const run = state.activeRun;
    if (!run) {
      throw new Error("Active run is missing.");
    }
    const currentQuestion = run.questions[run.currentIndex];
    if (!currentQuestion) {
      throw new Error("Current question is missing.");
    }
    await page.locator(`[data-side="${currentQuestion.correctSide}"]`).click();
    await waitForAdvance(page, run.currentIndex);
  }

  const beforeMistake = await readPilotState(page);
  const run = beforeMistake.activeRun;
  if (!run) {
    throw new Error("Active run is missing.");
  }
  const mistakeQuestion = run.questions[run.currentIndex];
  if (!mistakeQuestion) {
    throw new Error("Mistake question is missing.");
  }

  await page
    .locator(`[data-side="${oppositeSide(mistakeQuestion.correctSide)}"]`)
    .click();
  await waitForAdvance(page, run.currentIndex);

  const lastQuestionState = await readPilotState(page);
  const lastRun = lastQuestionState.activeRun;
  if (!lastRun) {
    throw new Error("Last run is missing.");
  }
  const lastQuestion = lastRun.questions[lastRun.currentIndex];
  if (!lastQuestion) {
    throw new Error("Last question is missing.");
  }

  await page.locator(`[data-side="${lastQuestion.correctSide}"]`).click();
  await expect(page.getByRole("heading", { name: "Забіг завершено" })).toBeVisible();
  await page.getByRole("button", { name: "Інший набір" }).click();
  await openLesson(page, "Їжа й напої");
  await finishReview(page);

  const nextRun = await readPilotState(page);
  expect(nextRun.activeRun?.questions[6]?.conceptId).toBe(mistakeQuestion.conceptId);
});

test("shows degraded audio copy without dead buttons when speech synthesis is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: undefined,
    });
  });

  await gotoApp(page, { speechAlreadyMocked: true });
  await acceptNotice(page);
  await expect(page.getByText("Без озвучення")).toBeVisible();
  await expect(page.locator('[data-action="toggle-sound"]')).toHaveCount(0);
  await openLesson(page, "Тварини");
  await expect(page.getByText("Озвучення недоступне")).toBeVisible();
  await expect(page.locator('[data-action="speak-current"]')).toHaveCount(0);
});

test("uses a natural Apple voice and adds a gentle mistake reaction", async ({ page }) => {
  await page.addInitScript(() => {
    type SpokenSample = {
      lang: string;
      pitch: number;
      rate: number;
      text: string;
      voiceName: string | null;
    };
    const spoken: SpokenSample[] = [];
    const voices = [
      {
        default: true,
        lang: "en-US",
        localService: true,
        name: "Ralph",
        voiceURI: "Ralph",
      },
      {
        default: false,
        lang: "en-US",
        localService: true,
        name: "Samantha",
        voiceURI: "com.apple.speech.synthesis.voice.samantha",
      },
    ] as SpeechSynthesisVoice[];
    class MockUtterance {
      lang = "";
      pitch = 1;
      rate = 1;
      voice: SpeechSynthesisVoice | null = null;

      constructor(readonly text = "") {}
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockUtterance,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel: () => undefined,
        getVoices: () => voices,
        speak: (utterance: MockUtterance) => {
          spoken.push({
            lang: utterance.lang,
            pitch: utterance.pitch,
            rate: utterance.rate,
            text: utterance.text,
            voiceName: utterance.voice?.name ?? null,
          });
        },
      },
    });
    Object.defineProperty(window, "__spokenSamples", {
      configurable: true,
      value: spoken,
    });
  });

  await gotoApp(page, { speechAlreadyMocked: true });
  await acceptNotice(page);
  await openLesson(page, "Тварини");
  const reviewWord = (await page.locator(".target-word").innerText()).trim();
  await page.locator('[data-action="speak-current"]').click();

  const sample = await page.evaluate(() =>
    (
      window as typeof window & {
        __spokenSamples: Array<{
          lang: string;
          pitch: number;
          rate: number;
          text: string;
          voiceName: string | null;
        }>;
      }
    ).__spokenSamples.at(-1),
  );
  expect(sample).toEqual({
    lang: "en-US",
    pitch: 1,
    rate: 0.9,
    text: reviewWord,
    voiceName: "Samantha",
  });

  await finishReview(page);
  const runState = await readPilotState(page);
  const question = runState.activeRun?.questions[0];
  if (!question) {
    throw new Error("Run question is missing.");
  }
  const wrongSide = question.correctSide === "left" ? "right" : "left";
  const correctWord = (
    await page.locator(`[data-side="${question.correctSide}"]`).innerText()
  ).trim();
  const spokenBeforeMistake = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __spokenSamples: Array<unknown>;
        }
      ).__spokenSamples.length,
  );
  await page.locator(`[data-side="${wrongSide}"]`).click();

  await expect(page.locator(".feedback-reaction")).toHaveText("О-о!");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __mistakeToneStarts: number;
            }
          ).__mistakeToneStarts,
      ),
    )
    .toBe(1);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __spokenSamples: Array<unknown>;
            }
          ).__spokenSamples.length,
      ),
    )
    .toBe(spokenBeforeMistake + 1);
  const correctionSamples = await page.evaluate(() =>
    (
      window as typeof window & {
        __spokenSamples: Array<{ text: string; voiceName: string | null }>;
      }
    ).__spokenSamples
      .slice(-1)
      .map(({ text, voiceName }) => ({ text, voiceName })),
  );
  expect(correctionSamples).toEqual([
    { text: correctWord, voiceName: "Samantha" },
  ]);

  await waitForAdvance(page, 0);
  const nextState = await readPilotState(page);
  const nextQuestion = nextState.activeRun?.questions[1];
  if (!nextQuestion) {
    throw new Error("Second run question is missing.");
  }
  await page.locator(`[data-side="${nextQuestion.correctSide}"]`).click();
  await expect(page.locator(".feedback-reaction")).toHaveText("Так!");
  const correctAnswerAudio = await page.evaluate(() => ({
    spoken:
      (
        window as typeof window & {
          __spokenSamples: Array<unknown>;
        }
      ).__spokenSamples.length,
    tones:
      (
        window as typeof window & {
          __mistakeToneStarts: number;
        }
      ).__mistakeToneStarts,
  }));
  expect(correctAnswerAudio).toEqual({
    spoken: spokenBeforeMistake + 2,
    tones: 1,
  });
});

test("keeps the existing 2D controls usable when WebGL2 is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(
      this: HTMLCanvasElement,
      contextId: string,
      options?: unknown,
    ) {
      if (contextId === "webgl2") {
        return null;
      }
      return original.call(this, contextId, options as never);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  await gotoApp(page);
  await expect(page.getByTestId("runner-canvas")).toHaveCount(0);
  await acceptNotice(page);
  await openLesson(page, "Тварини");
  await finishReview(page);
  await expect(page.getByText("Спрощений режим.")).toBeVisible();
  await expect(page.locator(".runner-sprite")).toBeVisible();

  const before = await readPilotState(page);
  const side = before.activeRun?.questions[0]?.correctSide;
  if (!side) {
    throw new Error("Fallback question is missing.");
  }
  await page.locator(`[data-side="${side}"]`).click();
  await waitForAdvance(page, 0);
});
