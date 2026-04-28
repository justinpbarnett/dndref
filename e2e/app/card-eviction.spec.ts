import { test, expect } from "@playwright/test";

import { setupTestWithSession, speakAndWait } from "../helpers";

test.describe("card eviction", () => {
  test.beforeEach(async ({ page }) => setupTestWithSession(page));

  test("all 5 sample entities fit within the 6-card limit", async ({ page }) => {
    for (const phrase of [
      "Valdrath on the throne",
      "entered Ironspire today",
      "Malachar in the dungeon",
      "Seraphine arrived",
      "Gorm the blacksmith",
    ]) {
      await speakAndWait(page, phrase);
    }
    await expect(page.getByTestId("entity-card")).toHaveCount(5);
  });

  test("pinned cards survive eviction pressure", async ({ page }) => {
    await speakAndWait(page, "Valdrath is here");

    const valdrath = page.getByTestId("entity-card").filter({ hasText: "Valdrath the Undying" });
    await valdrath.locator('[aria-label="Pin"]').click();

    for (const phrase of ["entered Ironspire", "Malachar in chains", "Seraphine arrived", "Gorm showed blueprints"]) {
      await speakAndWait(page, phrase);
    }

    await expect(page.getByText("Valdrath the Undying")).toBeVisible();
  });
});
