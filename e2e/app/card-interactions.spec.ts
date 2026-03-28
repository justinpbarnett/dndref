import { test, expect, Page } from '@playwright/test';
import {
  setupTest,
  startSession,
  speak,
  DETECT_WAIT_MS,
} from '../helpers';

test.describe('card interactions', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await setupTest(page);
    await startSession(page);
    await speak(page, 'Valdrath the Undying speaks');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByTestId('entity-card')).toHaveCount(1);
  });

  test('dismiss removes the card', async ({ page }) => {
    const card = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await card.locator('[aria-label="Dismiss"]').click();
    await expect(page.getByText('Valdrath the Undying')).not.toBeVisible();
    await expect(page.getByTestId('entity-card')).toHaveCount(0);
  });

  test('pin button toggles to Unpin after clicking', async ({ page }) => {
    const card = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await card.locator('[aria-label="Pin"]').click();
    await expect(card.locator('[aria-label="Unpin"]')).toBeVisible();
  });

  test('unpin returns card to unpinned state', async ({ page }) => {
    const card = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await card.locator('[aria-label="Pin"]').click();
    await card.locator('[aria-label="Unpin"]').click();
    await expect(card.locator('[aria-label="Pin"]')).toBeVisible();
  });

  test('dismissed entity re-appears when spoken again', async ({ page }) => {
    const card = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await card.locator('[aria-label="Dismiss"]').click();
    await expect(page.getByText('Valdrath the Undying')).not.toBeVisible();

    await speak(page, 'Valdrath returned to the chamber');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
  });

  test('dismissing one card leaves others intact', async ({ page }) => {
    await speak(page, 'Seraphine arrived to brief us');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByTestId('entity-card')).toHaveCount(2);

    const valdrath = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await valdrath.locator('[aria-label="Dismiss"]').click();

    await expect(page.getByText('Valdrath the Undying')).not.toBeVisible();
    await expect(page.getByText('Lady Seraphine Voss')).toBeVisible();
    await expect(page.getByTestId('entity-card')).toHaveCount(1);
  });
});
