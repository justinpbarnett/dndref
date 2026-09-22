import { test, expect } from "@playwright/test";

import { openTableSession, type TableSession } from "../helpers";

test.describe("voice entity detection", () => {
  let table: TableSession;

  test.beforeEach(async ({ page }) => {
    table = await openTableSession(page);
  });

  test("entity full name in speech surfaces a card", async ({ page }) => {
    await table.say("Valdrath the Undying approaches the throne");
    await expect(page.getByText("Valdrath the Undying")).toBeVisible();
  });

  test("entity alias triggers the canonical card", async ({ page }) => {
    await table.say("we entered Ironspire through the eastern gate");
    await expect(page.getByText("Ironspire Fortress")).toBeVisible();
  });

  test("multiple entities in one utterance surface multiple cards", async ({ page }) => {
    await table.say("Valdrath summoned Malachar to the fortress");
    await expect(page.getByText("Valdrath the Undying")).toBeVisible();
    await expect(page.getByText("Malachar the Grey")).toBeVisible();
  });

  test("unknown words produce no cards", async ({ page }) => {
    await table.say("the tavern keeper poured us another round");
    await expect(page.getByText("Awaiting entities…")).toBeVisible();
    await expect(page.getByTestId("entity-card")).toHaveCount(0);
  });

  test("same entity mentioned twice produces only one card", async ({ page }) => {
    await table.say("Valdrath spoke first");
    await table.say("then Valdrath spoke again");
    await expect(page.getByText("Valdrath the Undying")).toHaveCount(1);
  });

  test("subsequent utterances add to existing cards", async ({ page }) => {
    await table.say("Valdrath on the throne");
    await table.say("Seraphine arrived at the keep");
    await expect(page.getByText("Valdrath the Undying")).toBeVisible();
    await expect(page.getByText("Lady Seraphine Voss")).toBeVisible();
  });

  test("text added while paused is not detected after resume", async ({ page }) => {
    await table.say("Valdrath is watching");
    await expect(page.getByText("Valdrath the Undying")).toBeVisible();

    await table.pause();
    await table.sayWithoutWaiting("Malachar appeared in the dungeon");

    await table.resume();
    await table.waitForDetection();

    await expect(page.getByText("Malachar the Grey")).not.toBeVisible();
    await expect(page.getByText("Valdrath the Undying")).toBeVisible();
  });

  test("stop clears all cards; re-start detects fresh entities", async ({ page }) => {
    await table.say("Valdrath and Malachar confer");
    await table.stop();
    await expect(page.getByText("Valdrath the Undying")).not.toBeVisible();

    await table.start();
    await table.say("Seraphine briefed us on the mission");
    await expect(page.getByText("Lady Seraphine Voss")).toBeVisible();
    await expect(page.getByText("Valdrath the Undying")).not.toBeVisible();
  });
});
