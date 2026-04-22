import { test, expect, Page } from '@playwright/test';

import {
  setupTest,
  startSession,
  speak,
  DETECT_WAIT_MS,
} from '../helpers';

test.describe('card eviction', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await setupTest(page);
    await startSession(page);
  });

  test('all 5 sample entities fit within the 6-card limit', async ({ page }) => {
    for (const phrase of [
      'Valdrath on the throne',
      'entered Ironspire today',
      'Malachar in the dungeon',
      'Seraphine arrived',
      'Gorm the blacksmith',
    ]) {
      await speak(page, phrase);
      await page.waitForTimeout(DETECT_WAIT_MS);
    }
    await expect(page.getByTestId('entity-card')).toHaveCount(5);
  });

  test('pinned cards survive eviction pressure', async ({ page }) => {
    await speak(page, 'Valdrath is here');
    await page.waitForTimeout(DETECT_WAIT_MS);

    const valdrath = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await valdrath.locator('[aria-label="Pin"]').click();

    for (const phrase of [
      'entered Ironspire',
      'Malachar in chains',
      'Seraphine arrived',
      'Gorm showed blueprints',
    ]) {
      await speak(page, phrase);
      await page.waitForTimeout(DETECT_WAIT_MS);
    }

    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
  });
});
