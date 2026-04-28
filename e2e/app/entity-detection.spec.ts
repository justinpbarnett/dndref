import { test, expect } from "@playwright/test";

import {
  setupTestWithSession,
  speak,
  speakAndWait,
  startSession,
  pauseSession,
  stopSession,
  DETECT_WAIT_MS,
} from "../helpers";

test.describe("voice entity detection", () => {
  test.beforeEach(async ({ page }) => setupTestWithSession(page));

  test("entity full name in speech surfaces a card", async ({ page }) => {
    await speakAndWait(page, "Valdrath the Undying approaches the throne");
    await expect(page.getByText("Valdrath the Undying")).toBeVisible();
  });

  test("entity alias triggers the canonical card", async ({ page }) => {
    await speakAndWait(page, "we entered Ironspire through the eastern gate");
    await expect(page.getByText("Ironspire Fortress")).toBeVisible();
  });

  test("multiple entities in one utterance surface multiple cards", async ({ page }) => {
    await speakAndWait(page, "Valdrath summoned Malachar to the fortress");
    await expect(page.getByText("Valdrath the Undying")).toBeVisible();
    await expect(page.getByText("Malachar the Grey")).toBeVisible();
  });

  test("unknown words produce no cards", async ({ page }) => {
    await speakAndWait(page, "the tavern keeper poured us another round");
    await expect(page.getByText("Awaiting entities…")).toBeVisible();
    await expect(page.getByTestId("entity-card")).toHaveCount(0);
  });

  test("same entity mentioned twice produces only one card", async ({ page }) => {
    await speakAndWait(page, "Valdrath spoke first");
    await speakAndWait(page, "then Valdrath spoke again");
    await expect(page.getByText("Valdrath the Undying")).toHaveCount(1);
  });

  test("subsequent utterances add to existing cards", async ({ page }) => {
    await speakAndWait(page, "Valdrath on the throne");
    await speakAndWait(page, "Seraphine arrived at the keep");
    await expect(page.getByText("Valdrath the Undying")).toBeVisible();
    await expect(page.getByText("Lady Seraphine Voss")).toBeVisible();
  });

  test("text added while paused is not detected after resume", async ({ page }) => {
    await speakAndWait(page, "Valdrath is watching");
    await expect(page.getByText("Valdrath the Undying")).toBeVisible();

    await pauseSession(page);
    await speak(page, "Malachar appeared in the dungeon");

    await page.getByText("Resume", { exact: true }).click();
    await page.waitForTimeout(300);
    await page.waitForTimeout(DETECT_WAIT_MS);

    await expect(page.getByText("Malachar the Grey")).not.toBeVisible();
    await expect(page.getByText("Valdrath the Undying")).toBeVisible();
  });

  test("stop clears all cards; re-start detects fresh entities", async ({ page }) => {
    await speakAndWait(page, "Valdrath and Malachar confer");
    await stopSession(page);
    await expect(page.getByText("Valdrath the Undying")).not.toBeVisible();

    await startSession(page);
    await speakAndWait(page, "Seraphine briefed us on the mission");
    await expect(page.getByText("Lady Seraphine Voss")).toBeVisible();
    await expect(page.getByText("Valdrath the Undying")).not.toBeVisible();
  });
});
