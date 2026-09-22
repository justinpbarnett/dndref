import { test, expect } from "@playwright/test";

import { openTable, type TableSession } from "../helpers";

test.describe("session controls", () => {
  let table: TableSession;

  test.beforeEach(async ({ page }) => {
    table = await openTable(page);
  });

  test("idle: Start button and Ready status visible", async ({ page }) => {
    await expect(page.getByText("Start", { exact: true })).toBeVisible();
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    await expect(page.getByText("Session not started")).toBeVisible();
  });

  test("start: Listening status, Pause and Stop appear", async ({ page }) => {
    await table.start();
    await expect(page.getByText("Listening", { exact: true })).toBeVisible();
    await expect(page.getByText("Pause", { exact: true })).toBeVisible();
    await expect(page.getByText("Stop", { exact: true })).toBeVisible();
    await expect(page.getByText("Start", { exact: true })).not.toBeVisible();
  });

  // Start is clicked directly here, and only here: the subject is the button
  // under a second click too fast for the settle the driver waits out.
  test("rapid duplicate Start creates only one speech recognizer start", async ({ page }) => {
    const startButton = page.getByText("Start", { exact: true });
    await startButton.click();
    await page
      .getByText("Start", { exact: true })
      .click({ timeout: 100 })
      .catch(() => undefined);
    await expect(page.getByText("Listening", { exact: true })).toBeVisible();

    await expect.poll(() => table.startCount()).toBe(1);
  });

  test("start failure stays out of Listening and allows retry", async ({ page }) => {
    await table.failNextStart();

    await table.start();
    await expect(page.getByText("Mic Error", { exact: true })).toBeVisible();
    await expect(page.getByText("Listening", { exact: true })).not.toBeVisible();
    await expect(page.getByText("Start", { exact: true })).toBeVisible();

    await table.start();
    await expect(page.getByText("Listening", { exact: true })).toBeVisible();

    expect(await table.startCount()).toBe(2);
  });

  test("active: empty grid shows Awaiting entities", async ({ page }) => {
    await table.start();
    await expect(page.getByText("Awaiting entities…")).toBeVisible();
  });

  test("pause: Paused status, Resume replaces Pause", async ({ page }) => {
    await table.start();
    await table.pause();
    await expect(page.getByText("Paused", { exact: true })).toBeVisible();
    await expect(page.getByText("Resume", { exact: true })).toBeVisible();
    await expect(page.getByText("Pause", { exact: true })).not.toBeVisible();
  });

  test("resume: back to Listening", async ({ page }) => {
    await table.start();
    await table.pause();
    await table.resume();
    await expect(page.getByText("Listening", { exact: true })).toBeVisible();
    await expect(page.getByText("Pause", { exact: true })).toBeVisible();
  });

  test("ignored speech errors do not tear down the mic", async ({ page }) => {
    await table.start();
    await table.emitError("no-speech");
    await page.waitForTimeout(150);

    await expect(page.getByText("Listening", { exact: true })).toBeVisible();
    await expect(page.getByText("Mic Error", { exact: true })).not.toBeVisible();
  });

  test("fatal speech errors stop restart attempts and show recovery controls", async ({ page }) => {
    await table.start();
    await table.emitError();
    await expect(page.getByText("Mic Error", { exact: true })).toBeVisible();
    await expect(page.getByText("Resume", { exact: true })).toBeVisible();

    await table.emitEnd();
    await page.waitForTimeout(300);
    expect(await table.startCount()).toBe(1);
  });

  test("stop: resets to idle, clears session", async ({ page }) => {
    await table.start();
    await table.stop();
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    await expect(page.getByText("Start", { exact: true })).toBeVisible();
    await expect(page.getByText("Stop", { exact: true })).not.toBeVisible();
    await expect(page.getByText("Session not started")).toBeVisible();
  });
});
