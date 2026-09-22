import { test, expect } from "@playwright/test";

import { openTableSession, type TableSession } from "../helpers";

test.describe("entity details modal", () => {
  let table: TableSession;

  const showScarabCard = async () => {
    await table.say("Scarab of Protection");
    const card = table.page.getByTestId("entity-card").filter({ hasText: "Scarab of Protection" });
    await expect(card).toBeVisible();
    return card;
  };

  test.beforeEach(async ({ page }) => {
    table = await openTableSession(page);
  });

  test("clicking a card opens full details and closing keeps the card visible", async ({ page }) => {
    const card = await showScarabCard();

    await card.click();

    const dialog = page.getByRole("dialog", { name: "Scarab of Protection details" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("ITEM")).toBeVisible();
    await expect(dialog.getByText("Legendary.")).toBeVisible();
    await expect(dialog.getByText("If you hold this beetle-shaped medallion")).toBeVisible();
    await expect(dialog.getByText("The scarab has 12 charges")).toBeVisible();
    await expect(dialog.getByText(">").first()).toBeVisible();

    await dialog.getByRole("button", { name: "Close details" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(card).toBeVisible();
  });

  test("clicking outside the modal closes details without dismissing the card", async ({ page }) => {
    const card = await showScarabCard();

    await card.click();
    const dialog = page.getByRole("dialog", { name: "Scarab of Protection details" });
    await expect(dialog).toBeVisible();

    await page.mouse.click(20, 20);

    await expect(dialog).not.toBeVisible();
    await expect(card).toBeVisible();
  });

  test("pinning and dismissing cards do not open details", async ({ page }) => {
    const card = await showScarabCard();

    await card.locator('[aria-label="Pin"]').click();
    await expect(page.getByRole("dialog", { name: "Scarab of Protection details" })).not.toBeVisible();
    await expect(card.locator('[aria-label="Unpin"]')).toBeVisible();

    await card.locator('[aria-label="Dismiss"]').click();
    await expect(page.getByRole("dialog", { name: "Scarab of Protection details" })).not.toBeVisible();
    await expect(card).not.toBeVisible();
  });
});
