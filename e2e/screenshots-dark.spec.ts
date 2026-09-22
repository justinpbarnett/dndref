import { test } from "@playwright/test";

import { waitForSettledPage } from "./helpers";

test.use({ colorScheme: "dark" });

for (const [name, url, path] of [
  ["reference tab - dark mode", "/", "e2e/screenshots/dark-01-reference.png"],
  ["settings tab - dark mode", "/settings", "e2e/screenshots/dark-02-settings.png"],
] as const) {
  test(name, async ({ page }) => {
    await page.goto(url);
    await waitForSettledPage(page);
    await page.screenshot({ path });
  });
}

test("set light mode in settings, check reference matches", async ({ page }) => {
  await page.goto("/");
  await waitForSettledPage(page);
  await page.screenshot({ path: "e2e/screenshots/dark-03-ref-before.png" });

  await page.goto("/settings");
  await waitForSettledPage(page);
  await page.getByText("Light", { exact: true }).first().click({ force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/screenshots/dark-04-settings-light.png" });

  await page.goto("/");
  await waitForSettledPage(page);
  await page.screenshot({ path: "e2e/screenshots/dark-05-ref-after-light.png" });
});

test("tab bar close-up", async ({ page }) => {
  await page.goto("/");
  await waitForSettledPage(page);
  const viewport = page.viewportSize()!;
  await page.screenshot({
    path: "e2e/screenshots/dark-06-tabbar.png",
    clip: { x: 0, y: viewport.height - 60, width: viewport.width, height: 60 },
  });
});
