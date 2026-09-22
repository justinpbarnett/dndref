import { test } from "@playwright/test";

import { waitForSettledPage } from "./helpers";

for (const [name, url, path] of [
  ["reference tab - dark mode (default)", "/", "e2e/screenshots/01-reference-dark.png"],
  ["settings tab - dark mode", "/settings", "e2e/screenshots/02-settings-dark.png"],
  ["debug tab", "/debug", "e2e/screenshots/06-debug-dark.png"],
] as const) {
  test(name, async ({ page }) => {
    await page.goto(url);
    await waitForSettledPage(page);
    await page.screenshot({ path, fullPage: false });
  });
}

test("settings tab - switch to light mode", async ({ page }) => {
  await page.goto("/settings");
  await waitForSettledPage(page);
  await page.getByText("Light", { exact: true }).first().click({ force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/screenshots/03-settings-after-light.png", fullPage: false });
});

test("reference tab - after light mode set in same session", async ({ page }) => {
  await page.goto("/settings");
  await waitForSettledPage(page);
  await page.getByText("Light", { exact: true }).first().click({ force: true });
  await page.waitForTimeout(500);
  await page.goto("/");
  await waitForSettledPage(page);
  await page.screenshot({ path: "e2e/screenshots/04-reference-after-light.png", fullPage: false });
});

test("tab bar inspection", async ({ page }) => {
  await page.goto("/");
  await waitForSettledPage(page);
  const tabBar = page.locator('[role="tablist"]').first();
  await tabBar.screenshot({ path: "e2e/screenshots/05-tabbar.png" }).catch(() => {});
  const iconDivs = await page.locator('[style*="font-family: ionicons"]').all();
  console.log(`Found ${iconDivs.length} Ionicons divs`);
  for (const div of iconDivs) {
    const text = await div.textContent();
    const html = await div.innerHTML();
    console.log(`  textContent: "${text}" | innerHTML: "${html}"`);
  }
  const labels = await page.locator("text=REFERENCE").all();
  console.log(`Found ${labels.length} REFERENCE labels`);
  await page.screenshot({ path: "e2e/screenshots/05-tabbar-full.png", fullPage: false });
});

test("settings - all categories", async ({ page }) => {
  await page.goto("/settings");
  await waitForSettledPage(page);
  for (const cat of ["Display", "Voice", "Sources", "Files", "AI Parse"]) {
    const btn = page.getByText(cat).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(300);
    }
  }
  await page.screenshot({ path: "e2e/screenshots/07-settings-ai.png", fullPage: false });
});
