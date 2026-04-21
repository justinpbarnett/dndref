import { test, expect, Page } from '@playwright/test';

async function waitForApp(page: Page) {
  // Wait for fonts and JS to hydrate
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

test('reference tab - dark mode (default)', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.screenshot({ path: 'e2e/screenshots/01-reference-dark.png', fullPage: false });
});

test('settings tab - dark mode', async ({ page }) => {
  await page.goto('/settings');
  await waitForApp(page);
  await page.screenshot({ path: 'e2e/screenshots/02-settings-dark.png', fullPage: false });
});

test('settings tab - switch to light mode', async ({ page }) => {
  await page.goto('/settings');
  await waitForApp(page);
  // Click the Light button
  await page.getByText('Light', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/screenshots/03-settings-after-light.png', fullPage: false });
});

test('reference tab - after light mode set in same session', async ({ page }) => {
  // Set light mode on settings page, then navigate to reference
  await page.goto('/settings');
  await waitForApp(page);
  await page.getByText('Light', { exact: true }).first().click({ force: true });
  await page.waitForTimeout(500);
  // Navigate to reference tab
  await page.goto('/');
  await waitForApp(page);
  await page.screenshot({ path: 'e2e/screenshots/04-reference-after-light.png', fullPage: false });
});

test('tab bar inspection', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  // Get the tab bar area
  const tabBar = page.locator('[role="tablist"]').first();
  await tabBar.screenshot({ path: 'e2e/screenshots/05-tabbar.png' }).catch(() => {
    // Fallback: screenshot bottom of page
  });
  // Inspect icon elements
  const iconDivs = await page.locator('[style*="font-family: ionicons"]').all();
  console.log(`Found ${iconDivs.length} Ionicons divs`);
  for (const div of iconDivs) {
    const text = await div.textContent();
    const html = await div.innerHTML();
    console.log(`  textContent: "${text}" | innerHTML: "${html}"`);
  }
  // Inspect tab labels
  const labels = await page.locator('text=REFERENCE').all();
  console.log(`Found ${labels.length} REFERENCE labels`);
  await page.screenshot({ path: 'e2e/screenshots/05-tabbar-full.png', fullPage: false });
});

test('debug tab', async ({ page }) => {
  await page.goto('/debug');
  await waitForApp(page);
  await page.screenshot({ path: 'e2e/screenshots/06-debug-dark.png', fullPage: false });
});

test('settings - all categories', async ({ page }) => {
  await page.goto('/settings');
  await waitForApp(page);
  // Scroll through each category
  for (const cat of ['Display', 'Voice', 'Sources', 'Files', 'AI Parse']) {
    const btn = page.getByText(cat).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(300);
    }
  }
  await page.screenshot({ path: 'e2e/screenshots/07-settings-ai.png', fullPage: false });
});
