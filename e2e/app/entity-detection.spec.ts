import { test, expect, Page } from '@playwright/test';
import {
  setupTest,
  startSession,
  speak,
  pauseSession,
  stopSession,
  DETECT_WAIT_MS,
} from '../helpers';

test.describe('voice entity detection', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await setupTest(page);
    await startSession(page);
  });

  test('entity full name in speech surfaces a card', async ({ page }) => {
    await speak(page, 'Valdrath the Undying approaches the throne');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
  });

  test('entity alias triggers the canonical card', async ({ page }) => {
    await speak(page, 'we entered Ironspire through the eastern gate');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Ironspire Fortress')).toBeVisible();
  });

  test('multiple entities in one utterance surface multiple cards', async ({ page }) => {
    await speak(page, 'Valdrath summoned Malachar to the fortress');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
    await expect(page.getByText('Malachar the Grey')).toBeVisible();
  });

  test('unknown words produce no cards', async ({ page }) => {
    await speak(page, 'the tavern keeper poured us another round');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Awaiting entities…')).toBeVisible();
    await expect(page.getByTestId('entity-card')).toHaveCount(0);
  });

  test('same entity mentioned twice produces only one card', async ({ page }) => {
    await speak(page, 'Valdrath spoke first');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await speak(page, 'then Valdrath spoke again');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toHaveCount(1);
  });

  test('subsequent utterances add to existing cards', async ({ page }) => {
    await speak(page, 'Valdrath on the throne');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await speak(page, 'Seraphine arrived at the keep');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
    await expect(page.getByText('Lady Seraphine Voss')).toBeVisible();
  });

  test('text added while paused is not detected after resume', async ({ page }) => {
    await speak(page, 'Valdrath is watching');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();

    await pauseSession(page);
    await speak(page, 'Malachar appeared in the dungeon');

    await page.getByText('Resume', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.waitForTimeout(DETECT_WAIT_MS);

    await expect(page.getByText('Malachar the Grey')).not.toBeVisible();
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
  });

  test('stop clears all cards; re-start detects fresh entities', async ({ page }) => {
    await speak(page, 'Valdrath and Malachar confer');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await stopSession(page);
    await expect(page.getByText('Valdrath the Undying')).not.toBeVisible();

    await startSession(page);
    await speak(page, 'Seraphine briefed us on the mission');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Lady Seraphine Voss')).toBeVisible();
    await expect(page.getByText('Valdrath the Undying')).not.toBeVisible();
  });
});
