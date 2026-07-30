import { test } from "@playwright/test";

import {
  acceptNotice,
  expectNoHorizontalOverflow,
  finishReview,
  gotoApp,
  openLesson,
  openParentMetrics,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("avoids horizontal overflow on welcome, review, run, and metrics screens", async ({
  page,
}) => {
  await gotoApp(page);
  await expectNoHorizontalOverflow(page);

  await acceptNotice(page);
  await openParentMetrics(page);
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Закрити" }).click();
  await expectNoHorizontalOverflow(page);

  await openLesson(page, "Тварини");
  await expectNoHorizontalOverflow(page);

  await finishReview(page);
  await expectNoHorizontalOverflow(page);
});
