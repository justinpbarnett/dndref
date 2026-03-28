import { test, expect, Page } from '@playwright/test';
import {
  setupTest,
  startSession,
  pauseSession,
  stopSession,
  speak,
  DETECT_WAIT_MS,
} from '../helpers';

test.describe('edge cases', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await setupTest(page);
  });

  test('rapid start/stop cycle does not corrupt state', async ({ page }) => {
    await startSession(page);
    await stopSession(page);
    await startSession(page);
    await stopSession(page);
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
    await expect(page.getByText('Start', { exact: true })).toBeVisible();
    await expect(page.getByTestId('entity-card')).toHaveCount(0);
  });

  test('pause/resume cycle preserves existing cards', async ({ page }) => {
    await startSession(page);
    await speak(page, 'Valdrath watches from the throne');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();

    await pauseSession(page);
    await page.getByText('Resume', { exact: true }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
  });

  test('entity detection works after dismiss and re-mention in same session', async ({ page }) => {
    await startSession(page);
    await speak(page, 'Valdrath at the throne');
    await page.waitForTimeout(DETECT_WAIT_MS);

    const card = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await card.locator('[aria-label="Dismiss"]').click();
    await page.waitForTimeout(300);

    await speak(page, 'Valdrath returned to the fortress');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
  });

  test('multiple sessions accumulate fresh transcripts', async ({ page }) => {
    await startSession(page);
    await speak(page, 'Valdrath sits');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await stopSession(page);

    await startSession(page);
    await speak(page, 'Seraphine entered');
    await page.waitForTimeout(DETECT_WAIT_MS);

    await expect(page.getByText('Lady Seraphine Voss')).toBeVisible();
    await expect(page.getByText('Valdrath the Undying')).not.toBeVisible();
  });
});
