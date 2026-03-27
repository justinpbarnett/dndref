import { test, expect, Page } from '@playwright/test';

test.use({ colorScheme: 'dark' });

async function waitForApp(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

test('reference tab - dark mode', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.screenshot({ path: 'e2e/screenshots/dark-01-reference.png' });
});

test('settings tab - dark mode', async ({ page }) => {
  await page.goto('/settings');
  await waitForApp(page);
  await page.screenshot({ path: 'e2e/screenshots/dark-02-settings.png' });
});

test('set light mode in settings, check reference matches', async ({ page }) => {
  // Start on reference, note the theme
  await page.goto('/');
  await waitForApp(page);
  await page.screenshot({ path: 'e2e/screenshots/dark-03-ref-before.png' });

  // Navigate to settings and click Light
  await page.goto('/settings');
  await waitForApp(page);
  await page.getByText('Light').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/screenshots/dark-04-settings-light.png' });

  // Navigate back to reference - should now be light
  await page.goto('/');
  await waitForApp(page);
  await page.screenshot({ path: 'e2e/screenshots/dark-05-ref-after-light.png' });
});

test('tab bar close-up', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  // Crop to bottom of page for tab bar
  const viewport = page.viewportSize()!;
  await page.screenshot({
    path: 'e2e/screenshots/dark-06-tabbar.png',
    clip: { x: 0, y: viewport.height - 60, width: viewport.width, height: 60 },
  });
});
