import { test, expect, Page } from '@playwright/test';
import {
  setupTest,
  startSession,
  speak,
  waitForSettings,
  DETECT_WAIT_MS,
} from '../helpers';

test.describe('screenshots', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await setupTest(page);
  });

  test('idle state', async ({ page }) => {
    await page.screenshot({ path: 'e2e/screenshots/app-01-idle.png' });
  });

  test('active session with cards', async ({ page }) => {
    await startSession(page);
    await speak(page, 'Valdrath summoned Malachar and Seraphine to Ironspire');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await page.screenshot({ path: 'e2e/screenshots/app-02-active-cards.png' });
  });

  test('pinned card visual', async ({ page }) => {
    await startSession(page);
    await speak(page, 'Valdrath is here');
    await page.waitForTimeout(DETECT_WAIT_MS);
    const card = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await card.locator('[aria-label="Pin"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/screenshots/app-03-pinned.png' });
  });

  test('settings page', async ({ page }) => {
    await page.goto('/settings');
    await waitForSettings(page);
    await page.screenshot({ path: 'e2e/screenshots/app-04-settings.png' });
  });
});
