import { test, expect } from "@playwright/test";

import { openTable, type TableSession } from "../helpers";

test.describe("edge cases", () => {
  let table: TableSession;

  test.beforeEach(async ({ page }) => {
    table = await openTable(page);
  });

  test("rapid start/stop cycle does not corrupt state", async ({ page }) => {
    await table.start();
    await table.stop();
    await table.start();
    await table.stop();
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    await expect(page.getByText("Start", { exact: true })).toBeVisible();
    await expect(page.getByTestId("entity-card")).toHaveCount(0);
  });

  test("pause/resume cycle preserves existing cards", async ({ page }) => {
    await table.start();
    await table.say("Valdrath watches from the throne");
    await expect(page.getByText("Valdrath the Undying")).toBeVisible();

    await table.pause();
    await table.say("Seraphine entered while paused");
    await expect(page.getByText("Lady Seraphine Voss")).not.toBeVisible();

    await table.resume();
    await table.say("Seraphine entered after resume");

    await expect(page.getByText("Valdrath the Undying")).toBeVisible();
    await expect(page.getByText("Lady Seraphine Voss")).toBeVisible();
  });

  test("entity detection works after dismiss and re-mention in same session", async ({ page }) => {
    await table.start();
    await table.say("Valdrath at the throne");

    const card = page.getByTestId("entity-card").filter({ hasText: "Valdrath the Undying" });
    await card.locator('[aria-label="Dismiss"]').click();
    await page.waitForTimeout(300);

    await table.say("Valdrath returned to the fortress");
    await expect(page.getByText("Valdrath the Undying")).toBeVisible();
  });

  test("multiple sessions accumulate fresh transcripts", async ({ page }) => {
    await table.start();
    await table.say("Valdrath sits");
    await table.stop();

    await table.start();
    await table.say("Seraphine entered");

    await expect(page.getByText("Lady Seraphine Voss")).toBeVisible();
    await expect(page.getByText("Valdrath the Undying")).not.toBeVisible();
  });

  test("stale speech callbacks after stop do not mutate a reset session", async ({ page }) => {
    await table.start();
    const startCountBeforeStop = await table.startCount();
    await table.stop();

    await table.sayWithoutWaiting("Valdrath should not appear after stop");
    await table.emitError();
    await table.emitEnd();
    await table.waitForDetection();

    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    await expect(page.getByText("Mic Error", { exact: true })).not.toBeVisible();
    await expect(page.getByTestId("entity-card")).toHaveCount(0);
    expect(await table.startCount()).toBe(startCountBeforeStop);
  });
});
