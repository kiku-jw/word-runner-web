import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  acceptNotice,
  answerCurrentQuestion,
  completeRun,
  expectDownloadedJson,
  finishReview,
  gotoApp,
  openLesson,
  openParentMetrics,
  readPilotState,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("shows the privacy-first welcome and avoids third-party traffic or cookies", async ({
  page,
  context,
  baseURL,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    requests.push(request.url());
  });

  await gotoApp(page);

  await expect(page.getByText("Без акаунта і реклами. Дані лишаються у цьому браузері.")).toBeVisible();
  expect(await context.cookies()).toEqual([]);

  const allowedOrigin = new URL(baseURL!).origin;
  for (const url of requests) {
    const protocol = new URL(url).protocol;
    if (protocol === "data:" || protocol === "blob:") {
      continue;
    }
    expect(new URL(url).origin).toBe(allowedOrigin);
  }
});

test("opens with a real 3D attract scene and starts a run in one tap", async ({
  page,
}) => {
  await gotoApp(page);

  const canvas = page.getByTestId("runner-canvas");
  await expect(canvas).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => window.__WORD_RUNNER_3D__?.snapshot()?.frameCount ?? 0),
    )
    .toBeGreaterThan(2);
  await expect
    .poll(() =>
      page.evaluate(() => window.__WORD_RUNNER_3D__?.snapshot()?.view ?? null),
    )
    .toBe("front");
  const idleStart = await page.evaluate(() =>
    window.__WORD_RUNNER_3D__?.snapshot() ?? null,
  );
  await page.waitForTimeout(220);
  const idleEnd = await page.evaluate(() =>
    window.__WORD_RUNNER_3D__?.snapshot() ?? null,
  );
  expect(idleEnd?.frameCount).toBeGreaterThan(idleStart?.frameCount ?? 0);
  expect(idleEnd?.worldSpeed).toBe(0);
  expect(idleEnd?.worldTravel).toBe(idleStart?.worldTravel);

  await page.getByRole("button", { name: "Грати" }).click();
  await expect(page.getByTestId("game-stage")).toBeVisible();
  await expect(page.getByText("1 / 10")).toBeVisible();
  const state = await readPilotState(page);
  expect(state.eventLog.some((event) => event.type === "run_started")).toBe(true);

  const snapshot = await page.evaluate(() =>
    window.__WORD_RUNNER_3D__?.snapshot() ?? null,
  );
  expect(snapshot?.ready).toBe(true);
  expect(snapshot?.view).toBe("run");
  expect(snapshot?.questionId).not.toBeNull();
  expect(snapshot?.drawCalls).toBeLessThan(100);
  expect(snapshot?.pixelRatio).toBeLessThanOrEqual(1.25);
  expect(snapshot?.gateZ).toBeLessThan(-28);

  const approachStart = snapshot;
  await page.waitForTimeout(700);
  const approachEnd = await page.evaluate(() =>
    window.__WORD_RUNNER_3D__?.snapshot() ?? null,
  );
  const gateTravel = (approachEnd?.gateZ ?? 0) - (approachStart?.gateZ ?? 0);
  const worldTravel =
    (approachEnd?.worldTravel ?? 0) - (approachStart?.worldTravel ?? 0);
  expect(gateTravel).toBeGreaterThan(0);
  expect(Math.abs(gateTravel - worldTravel)).toBeLessThanOrEqual(0.2);
  expect(approachEnd?.gateZ).toBeLessThan(-24);
});

test("offers three open levels with separate content and a next-level challenge", async ({
  page,
}) => {
  test.slow();
  await gotoApp(page, { disableWebgl: true });
  await acceptNotice(page);

  await expect(page.getByRole("button", { name: /Легкий/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: /Середній/ }).click();
  await expect(page.getByRole("button", { name: /Середній/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: /Дім/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Тварини/ })).toHaveCount(0);

  await openLesson(page, "Дім");
  await expect(page.locator(".level-chip", { hasText: "Середній" })).toBeVisible();
  await finishReview(page);

  const startedState = await readPilotState(page);
  expect(startedState.activeLessonId).toBe("medium-home");
  await expect(page.getByTestId("game-stage")).toHaveAttribute(
    "data-difficulty",
    "2",
  );

  await completeRun(page);
  await expect(
    page.getByRole("button", { name: "Спробувати складний" }),
  ).toBeVisible();

  const completedState = await readPilotState(page);
  expect(
    completedState.eventLog.some(
      (event) => event.type === "run_completed" && event.difficulty === 2,
    ),
  ).toBe(true);
  expect(Object.keys(completedState.conceptProgress)).toEqual(
    expect.arrayContaining([
      "kitchen",
      "bedroom",
      "window",
      "mirror",
      "carpet",
      "stairs",
    ]),
  );

  await page.getByRole("button", { name: "Спробувати складний" }).click();
  await expect(page.getByRole("button", { name: /Складний/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: /Слова-пастки/ })).toBeVisible();
});

test("plays a local shuffled soundtrack with fades and a 20 percent ceiling", async ({
  page,
  request,
  baseURL,
}) => {
  const trackNames = [
    "bouncy-block-adventure-1.mp3",
    "bouncy-block-adventure-2.mp3",
    "bouncy-block-adventure-3.mp3",
    "marble-dash-parade.mp3",
  ];
  for (const trackName of trackNames) {
    const response = await request.fetch(
      new URL(`assets/music/${trackName}`, baseURL).toString(),
      { method: "HEAD" },
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("audio/mpeg");
  }

  await gotoApp(page);
  await page.getByRole("button", { name: "Грати" }).click();

  await expect
    .poll(() =>
      page.evaluate(() => window.__WORD_RUNNER_MUSIC__?.snapshot() ?? null),
    )
    .toMatchObject({
      enabled: true,
      started: true,
      playing: true,
      targetVolume: 0.2,
      pageVisible: true,
    });

  const playedTracks: string[] = [];
  let nextCycleTrack: string | null = null;
  for (let index = 0; index < trackNames.length; index += 1) {
    const currentTrack = await page.evaluate(
      () => window.__WORD_RUNNER_MUSIC__?.snapshot()?.currentTrack ?? null,
    );
    expect(currentTrack).not.toBeNull();
    playedTracks.push(currentTrack!);
    const trackAfterFinish = await page.evaluate(() => {
      (
        window as typeof window & {
          __musicAudioHarness: { finish(): void };
        }
      ).__musicAudioHarness.finish();
      return window.__WORD_RUNNER_MUSIC__?.snapshot()?.currentTrack ?? null;
    });
    if (index < trackNames.length - 1) {
      expect(trackAfterFinish).not.toBe(currentTrack);
    } else {
      nextCycleTrack = trackAfterFinish;
    }
  }
  expect(new Set(playedTracks).size).toBe(trackNames.length);
  expect(nextCycleTrack).not.toBe(playedTracks.at(-1));

  await page
    .getByRole("button", { name: "Звук: так" })
    .evaluate((button) => (button as HTMLButtonElement).click());
  expect(
    await page.evaluate(() => window.__WORD_RUNNER_MUSIC__?.snapshot() ?? null),
  ).toMatchObject({ enabled: false, playing: false, volume: 0 });

  await page.getByRole("button", { name: "Звук: ні" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__WORD_RUNNER_MUSIC__?.snapshot()?.playing),
    )
    .toBe(true);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(
    await page.evaluate(() => window.__WORD_RUNNER_MUSIC__?.snapshot() ?? null),
  ).toMatchObject({ pageVisible: false, playing: false, volume: 0 });
});

test("starts the selected level from the menu and counts an unanswered question as an error", async ({
  page,
}) => {
  test.slow();
  await gotoApp(page, {
    disableWebgl: true,
    realQuestionTimeout: true,
  });

  await page.getByRole("button", { name: /Складний\. Слова-пастки/ }).click();
  await expect(page.getByRole("button", { name: /Складний\. Слова-пастки/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Грати" }).click();

  const started = await readPilotState(page);
  expect(started.activeLessonId).toMatch(/^hard-/);
  const firstConceptId = started.activeRun?.questions[0]?.conceptId;
  expect(firstConceptId).toBeTruthy();
  await expect(page.locator(".question-timer")).toBeVisible();

  await expect
    .poll(async () => {
      const current = await readPilotState(page);
      return current.eventLog.some(
        (event) =>
          event.type === "answer_selected" && event.inputMethod === "timeout",
      );
    }, { timeout: 12_000 })
    .toBe(true);

  const timedOut = await readPilotState(page);
  expect(
    timedOut.eventLog.find(
      (event) =>
        event.type === "answer_selected" && event.inputMethod === "timeout",
    )?.selectedSide,
  ).toBeNull();
  expect(timedOut.eventLog.some(
    (event) => event.type === "lane_selected" && event.inputMethod === "timeout",
  )).toBe(false);
  const progress = timedOut.conceptProgress[firstConceptId!] as {
    attempts: number;
    errors: number;
  };
  expect(progress).toMatchObject({ attempts: 1, errors: 1 });

  await expect
    .poll(async () => (await readPilotState(page)).activeRun?.currentIndex ?? -1)
    .toBe(1);
});

test("turns a correct lane choice into a physical gate opening without a modal pause", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Тварини");
  await finishReview(page);

  const runState = await readPilotState(page);
  const activeRun = runState.activeRun;
  const question = activeRun?.questions[activeRun.currentIndex];
  expect(question).toBeTruthy();

  const feedbackLayout = await page
    .locator(`[data-side="${question?.correctSide}"]`)
    .evaluate(async (button) => {
      (button as HTMLButtonElement).click();
      const feedbackElement =
        document.querySelector<HTMLElement>(".feedback-layer");
      const stageElement =
        document.querySelector<HTMLElement>('[data-testid="game-stage"]');
      if (!feedbackElement || !stageElement) {
        return null;
      }
      const layout = {
        feedbackHeight: feedbackElement.getBoundingClientRect().height,
        stageHeight: stageElement.getBoundingClientRect().height,
        pointerEvents: getComputedStyle(feedbackElement).pointerEvents,
      };
      await new Promise<void>((resolve) => {
        const deadline = performance.now() + 500;
        const waitForOpenFrame = () => {
          if (
            (window.__WORD_RUNNER_3D__?.snapshot()?.doorOpen ?? 0) > 0 ||
            performance.now() >= deadline
          ) {
            resolve();
            return;
          }
          window.requestAnimationFrame(waitForOpenFrame);
        };
        window.requestAnimationFrame(waitForOpenFrame);
      });
      return {
        ...layout,
        scene: window.__WORD_RUNNER_3D__?.snapshot() ?? null,
      };
    });
  expect(feedbackLayout).not.toBeNull();
  expect(feedbackLayout!.feedbackHeight).toBeLessThan(
    feedbackLayout!.stageHeight * 0.22,
  );
  expect(feedbackLayout!.pointerEvents).toBe("none");
  expect(feedbackLayout!.scene?.gateResponse).toMatch(/opening|cleared/);
  expect(feedbackLayout!.scene?.doorOpen).toBeGreaterThan(0);
  expect(feedbackLayout!.scene?.drawCalls).toBeLessThan(100);
});

test("adds one deterministic background gag and a playful wrong-answer reaction", async ({
  page,
}) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Тварини");
  await finishReview(page);

  const gagQuestionIndex = await page.evaluate(
    () => window.__WORD_RUNNER_3D__?.snapshot()?.backgroundGagQuestionIndex ?? -1,
  );
  expect(gagQuestionIndex).toBeGreaterThanOrEqual(2);
  expect(gagQuestionIndex).toBeLessThanOrEqual(6);

  while ((await readPilotState(page)).activeRun?.currentIndex !== gagQuestionIndex) {
    await answerCurrentQuestion(page);
  }

  await expect
    .poll(() =>
      page.evaluate(() => window.__WORD_RUNNER_3D__?.snapshot()?.backgroundGagVisible ?? false),
    )
    .toBe(true);
  await page.evaluate(
    () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve())),
  );
  const gagSnapshot = await page.evaluate(() =>
    window.__WORD_RUNNER_3D__?.snapshot() ?? null,
  );
  expect(gagSnapshot?.drawCalls).toBeLessThan(100);

  const runState = await readPilotState(page);
  const question = runState.activeRun?.questions[runState.activeRun.currentIndex];
  expect(question).toBeTruthy();
  const wrongSide = question?.correctSide === "left" ? "right" : "left";
  const wrongReaction = await page
    .locator(`[data-side="${wrongSide}"]`)
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      return window.__WORD_RUNNER_3D__?.snapshot()?.reaction ?? "none";
    });

  expect(wrongReaction).toMatch(/stumble|backpack|gate/);
  const blockedStart = await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
    return window.__WORD_RUNNER_3D__?.snapshot() ?? null;
  });
  await page.waitForTimeout(80);
  const blockedEnd = await page.evaluate(() =>
    window.__WORD_RUNNER_3D__?.snapshot() ?? null,
  );
  expect(blockedStart?.gateResponse).toBe("blocked");
  expect(blockedStart?.worldSpeed).toBe(0);
  expect(blockedEnd?.gateZ).toBe(blockedStart?.gateZ);
  expect(blockedEnd?.worldTravel).toBe(blockedStart?.worldTravel);
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
    .poll(async () => (await readPilotState(page)).activeRun?.currentIndex ?? -1)
    .toBe(gagQuestionIndex + 1);
  await expect
    .poll(() =>
      page.evaluate(() => window.__WORD_RUNNER_3D__?.snapshot()?.backgroundGagVisible ?? false),
    )
    .toBe(false);
});

test("fires the rocket backpack only on the third consecutive correct answer", async ({
  page,
}) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Їжа й напої");
  await finishReview(page);

  const expectedReactions = ["correct", "correct", "rocket", "correct"] as const;
  for (const [index, expectedReaction] of expectedReactions.entries()) {
    const runState = await readPilotState(page);
    const activeRun = runState.activeRun;
    const question = activeRun?.questions[activeRun.currentIndex];
    expect(question).toBeTruthy();

    const reaction = await page
      .locator(`[data-side="${question?.correctSide}"]`)
      .evaluate((button) => {
        (button as HTMLButtonElement).click();
        return window.__WORD_RUNNER_3D__?.snapshot()?.reaction ?? "none";
      });
    expect(reaction).toBe(expectedReaction);

    if (index < expectedReactions.length - 1) {
      await expect
        .poll(async () => (await readPilotState(page)).activeRun?.currentIndex ?? -1)
        .toBe((activeRun?.currentIndex ?? 0) + 1);
    }
  }
});

test("guides a child from lesson review through ten gates to the result screen", async ({
  page,
}) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Тварини");
  await finishReview(page);

  await expect(page.getByText("1 / 10")).toBeVisible();
  for (let index = 0; index < 10; index += 1) {
    await answerCurrentQuestion(page);
  }

  await expect(page.locator(".result-score small")).toHaveText(
    "з 10 правильних",
  );
  await expect(page.locator(".practised-words span")).toHaveCount(6);
  await expect(page.getByRole("button", { name: "Бігти ще раз" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Інший набір" })).toBeVisible();
  const completedState = await readPilotState(page);
  expect(
    completedState.eventLog.some((event) => event.type === "render_sampled"),
  ).toBe(true);
});

test("lets a child skip the word review from its first card", async ({ page }) => {
  await gotoApp(page, { disableWebgl: true });
  await acceptNotice(page);
  await openLesson(page, "Тварини");

  await expect(page.getByText("1 / 6")).toBeVisible();
  await page
    .getByRole("button", { name: "Пропустити слова й одразу бігти" })
    .click();

  await expect(page.getByTestId("game-stage")).toBeVisible();
  await expect(page.getByText("1 / 10")).toBeVisible();
  const state = await readPilotState(page);
  expect(state.activeRun?.currentIndex).toBe(0);
  expect(state.eventLog.some((event) => event.type === "run_started")).toBe(true);
});

test("restores an in-progress run after reload without losing local progress", async ({
  page,
}) => {
  await gotoApp(page, { disableWebgl: true });
  await acceptNotice(page);
  await openLesson(page, "Їжа й напої");
  await finishReview(page);

  await answerCurrentQuestion(page);
  await answerCurrentQuestion(page);
  const beforeReload = await readPilotState(page);

  await page.reload();

  await expect(page.getByRole("heading", { name: "Словобіг" })).toBeVisible();
  await expect(page.getByTestId("game-stage")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Продовжити · 3/10" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Новий забіг" })).toBeVisible();

  const onMenu = await readPilotState(page);
  expect(onMenu.activeLessonId).toBe(beforeReload.activeLessonId);
  expect(onMenu.activeRun?.currentIndex).toBe(beforeReload.activeRun?.currentIndex);
  expect(onMenu.eventLog.some((event) => event.type === "session_resumed")).toBe(false);
  expect(
    await page.evaluate(
      () => window.__WORD_RUNNER_MUSIC__?.snapshot()?.started ?? false,
    ),
  ).toBe(false);

  await page.getByRole("button", { name: "Продовжити · 3/10" }).click();
  await expect(page.getByTestId("game-stage")).toBeVisible();
  await expect(page.getByText("3 / 10")).toBeVisible();
  expect(
    await page.evaluate(
      () => window.__WORD_RUNNER_MUSIC__?.snapshot()?.started ?? false,
    ),
  ).toBe(true);

  const afterReload = await readPilotState(page);
  expect(afterReload.activeLessonId).toBe(beforeReload.activeLessonId);
  expect(afterReload.activeRun?.currentIndex).toBe(beforeReload.activeRun?.currentIndex);
  expect(afterReload.eventLog.length).toBeGreaterThanOrEqual(beforeReload.eventLog.length);
  expect(afterReload.eventLog.some((event) => event.type === "session_resumed")).toBe(true);
});

test("requires a two-second adult hold before exposing metrics and reset/export actions", async ({
  page,
}) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Природа");
  await finishReview(page);
  await completeRun(page);
  await page.getByRole("button", { name: "Інший набір" }).click();
  await expect(page.getByRole("heading", { name: "Куди біжимо?" })).toBeVisible();

  await page.locator('[data-action="open-parent-gate"]').click();
  const holdButton = page.locator('[data-action="hold-parent-gate"]');
  await holdButton.dispatchEvent("pointerdown");
  await page.waitForTimeout(600);
  await holdButton.dispatchEvent("pointerup");
  await expect(page.getByRole("heading", { name: "Розділ для дорослих" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Метрики пілоту" })).toHaveCount(0);

  await openParentMetrics(page);

  await expect(page.getByText("Час подій, вибір воріт, правильність, повтори та оцінка.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Експортувати JSON" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Стерти локальні дані" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Експортувати JSON" }).click();
  const json = await expectDownloadedJson(await downloadPromise);
  const exported = JSON.parse(json) as {
    schemaVersion: number;
    participantId: string;
    events: Array<{ type: string }>;
  };
  expect(exported.schemaVersion).toBe(1);
  expect(exported.participantId.length).toBeGreaterThan(0);
  expect(exported.events.some((event) => event.type === "run_completed")).toBe(true);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Стерти локальні дані" }).click();
  await expect(page.getByRole("heading", { name: "Словобіг" })).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => window.localStorage.length))
    .toBe(1);
  const resetState = await readPilotState(page);
  expect(resetState.noticeConfirmed).toBe(false);
  expect(resetState.activeRun).toBeNull();
  expect(resetState.eventLog).toHaveLength(1);
  expect(resetState.eventLog[0]?.type).toBe("session_started");
});

test("keeps an active run playable after the browser goes offline mid-session", async ({
  page,
  context,
}) => {
  await gotoApp(page);
  await acceptNotice(page);
  await openLesson(page, "Транспорт");
  await finishReview(page);

  await answerCurrentQuestion(page);
  await context.setOffline(true);

  for (let index = 0; index < 9; index += 1) {
    await answerCurrentQuestion(page);
  }

  await expect(page.getByRole("heading", { name: "Забіг завершено" })).toBeVisible();
  await context.setOffline(false);
});

test("has no critical axe violations on welcome, gameplay, and parent metrics screens", async ({
  page,
}) => {
  await gotoApp(page);

  const welcomeResults = await new AxeBuilder({ page }).analyze();
  expect(welcomeResults.violations).toEqual([]);

  await acceptNotice(page);
  await openParentMetrics(page);
  const metricsResults = await new AxeBuilder({ page }).analyze();
  expect(metricsResults.violations).toEqual([]);

  await page.getByRole("button", { name: "Закрити" }).click();
  await expect(page.getByRole("heading", { name: "Куди біжимо?" })).toBeVisible();
  await openLesson(page, "Тварини");
  await finishReview(page);

  const runResults = await new AxeBuilder({ page }).analyze();
  expect(runResults.violations).toEqual([]);
});
