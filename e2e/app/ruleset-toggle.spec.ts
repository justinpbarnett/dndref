import { test, expect } from "@playwright/test";

import { openTableSession, type TableSession } from "../helpers";

test.describe("ruleset toggle", () => {
  let table: TableSession;

  test.beforeEach(async ({ page }) => {
    table = await openTableSession(page);
  });

  test("starts on D&D, which is the world the sample campaign is in", async ({ page }) => {
    await expect(page.getByTestId("ruleset-dnd")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("ruleset-mtg")).toHaveAttribute("aria-checked", "false");
  });

  test("matches a card name once the table is playing Magic", async ({ page }) => {
    await table.switchTo("mtg");
    await table.say("I cast Lightning Bolt at the wizard");

    const card = page.getByTestId("entity-card").filter({ hasText: "Lightning Bolt" });
    await expect(card).toBeVisible();
    // The card face strips a bullet's trailing stop, so the assertion stops short of it.
    await expect(card).toContainText("Deals 3 damage to any target");
  });

  test("matches a two-faced card by the face that was actually spoken", async ({ page }) => {
    await table.switchTo("mtg");
    await table.say("flip it into Insectile Aberration");

    await expect(page.getByTestId("entity-card").filter({ hasText: "Delver of Secrets" })).toBeVisible();
  });

  test("clears cards from the game that is no longer being played", async ({ page }) => {
    await table.say("Valdrath the Undying speaks");
    await expect(page.getByTestId("entity-card")).toHaveCount(1);

    await table.switchTo("mtg");

    await expect(page.getByTestId("entity-card")).toHaveCount(0);
  });

  test("leaves the session running across the switch", async ({ page }) => {
    await table.switchTo("mtg");

    // Stop is only offered while a session is live, so its presence is the assertion.
    await expect(page.getByText("Stop", { exact: true })).toBeVisible();
    await expect(page.getByTestId("ruleset-mtg")).toHaveAttribute("aria-checked", "true");
  });

  test("finds the campaign again on the way back", async ({ page }) => {
    await table.switchTo("mtg");
    await table.switchTo("dnd");
    await table.say("Valdrath the Undying speaks");

    await expect(page.getByTestId("entity-card").filter({ hasText: "Valdrath the Undying" })).toBeVisible();
  });
});
