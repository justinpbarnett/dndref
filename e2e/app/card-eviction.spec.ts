import { test, expect } from "@playwright/test";

import { openTableSession, type TableSession } from "../helpers";

test.describe("card eviction", () => {
  let table: TableSession;

  test.beforeEach(async ({ page }) => {
    table = await openTableSession(page);
  });

  test("all 5 sample entities fit within the 6-card limit", async ({ page }) => {
    for (const phrase of [
      "Valdrath on the throne",
      "entered Ironspire today",
      "Malachar in the dungeon",
      "Seraphine arrived",
      "Gorm the blacksmith",
    ]) {
      await table.say(phrase);
    }
    await expect(page.getByTestId("entity-card")).toHaveCount(5);
  });

  test("pinned cards survive eviction pressure", async ({ page }) => {
    await table.say("Valdrath is here");

    const valdrath = page.getByTestId("entity-card").filter({ hasText: "Valdrath the Undying" });
    await valdrath.locator('[aria-label="Pin"]').click();

    for (const phrase of ["entered Ironspire", "Malachar in chains", "Seraphine arrived", "Gorm showed blueprints"]) {
      await table.say(phrase);
    }

    await expect(page.getByText("Valdrath the Undying")).toBeVisible();
  });
});
