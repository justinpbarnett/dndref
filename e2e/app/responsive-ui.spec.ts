import { test, expect, Page } from '@playwright/test';

import {
  DETECT_WAIT_MS,
  setupTest,
  speak,
  startSession,
  waitForSettings,
} from '../helpers';

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 360, height: 640 };

async function expectInsideViewport(page: Page, text: string) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('viewport is required for layout assertions');

  const item = page.getByText(text, { exact: true }).last();
  await expect(item).toBeVisible();

  const box = await item.boundingBox();
  expect(box, `${text} should have a bounding box`).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectTabLabelReadable(page: Page, text: string) {
  await expectInsideViewport(page, text);

  const item = page.getByText(text, { exact: true }).last();
  const metrics = await item.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return { height: rect.height, overflow: style.overflow };
  });

  expect(metrics.height).toBeGreaterThanOrEqual(14);
  expect(metrics.overflow).toBe('visible');
}

async function populateCards(page: Page) {
  await startSession(page);
  await speak(
    page,
    'Valdrath summoned Malachar and Seraphine to Ironspire. Gorm carries the Sundering Blade through Silvermarsh.',
  );
  await page.waitForTimeout(DETECT_WAIT_MS);
  await expect(page.getByTestId('entity-card')).toHaveCount(6);
}

test.describe('responsive UI coverage', () => {
  test('empty reference state keeps primary tab labels visible on desktop and mobile', async ({ page }) => {
    for (const viewport of [DESKTOP, MOBILE]) {
      await page.setViewportSize(viewport);
      await setupTest(page);

      await expect(page.getByText('Session not started')).toBeVisible();
      await expectTabLabelReadable(page, 'REFERENCE');
      await expectTabLabelReadable(page, 'SETTINGS');
    }
  });

  test('mobile populated cards use a readable single-column layout', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await setupTest(page);
    await populateCards(page);

    const first = await page.getByTestId('entity-card').nth(0).boundingBox();
    const second = await page.getByTestId('entity-card').nth(1).boundingBox();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.width).toBeGreaterThanOrEqual(330);
    expect(first!.x).toBeGreaterThanOrEqual(0);
    expect(first!.x + first!.width).toBeLessThanOrEqual(MOBILE.width + 1);
    expect(Math.abs(first!.x - second!.x)).toBeLessThanOrEqual(2);
    expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
  });

  test('desktop populated cards stay constrained and centered', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await setupTest(page);
    await populateCards(page);

    const first = await page.getByTestId('entity-card').nth(0).boundingBox();
    const second = await page.getByTestId('entity-card').nth(1).boundingBox();
    const third = await page.getByTestId('entity-card').nth(2).boundingBox();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(third).not.toBeNull();
    expect(first!.x).toBeGreaterThan(100);
    expect(first!.width).toBeLessThanOrEqual(400);
    expect(Math.abs(first!.y - second!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(second!.y - third!.y)).toBeLessThanOrEqual(2);
  });

  test('settings content is constrained on desktop and category tabs fit on mobile', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await setupTest(page);
    await page.goto('/settings');
    await waitForSettings(page);

    const desktopContent = await page.getByTestId('settings-content').boundingBox();
    expect(desktopContent).not.toBeNull();
    expect(desktopContent!.width).toBeLessThanOrEqual(900);

    await page.setViewportSize(MOBILE);
    await page.goto('/settings');
    await waitForSettings(page);

    for (const label of ['DISPLAY', 'VOICE', 'SOURCES', 'FILES', 'AI PARSE']) {
      await expectInsideViewport(page, label);
    }
  });

  test('settings subviews cover empty and full-content states on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await setupTest(page);
    await page.goto('/settings');
    await waitForSettings(page);

    await page.getByText('FILES', { exact: true }).click();
    await expect(page.getByText('UPLOAD FILES')).toBeVisible();
    await expect(page.getByText('Add', { exact: true })).toBeVisible();

    await page.getByPlaceholder('File name (e.g. my-campaign.md)').fill('long-mobile-layout-check.md');
    await page.getByPlaceholder('Paste content here...').fill('Valdrath\\nIronspire\\nThe Sundering Blade');
    await expect(page.getByText('Add', { exact: true })).toBeEnabled();

    await page.getByText('SOURCES', { exact: true }).click();
    await page.getByText(/Critical Role/).scrollIntoViewIfNeeded();
    await expect(page.getByText(/Critical Role/)).toBeVisible();
    await expectInsideViewport(page, 'SETTINGS');
  });

  test('settings file uploads can be removed one at a time', async ({ page }) => {
    await setupTest(page);
    await page.goto('/settings');
    await waitForSettings(page);
    await page.getByText('Files', { exact: true }).click();

    await page.getByPlaceholder('File name (e.g. my-campaign.md)').fill('keep-me.md');
    await page.getByPlaceholder('Paste content here...').fill('Valdrath');
    await page.getByText('Add', { exact: true }).click();
    await expect(page.getByText('keep-me.md')).toBeVisible();

    await page.getByPlaceholder('File name (e.g. my-campaign.md)').fill('remove-me.md');
    await page.getByPlaceholder('Paste content here...').fill('Ironspire');
    await page.getByText('Add', { exact: true }).click();

    await expect(page.getByText('UPLOADED (2)')).toBeVisible();
    await page.getByRole('button', { name: 'Remove upload remove-me.md' }).click();

    await expect(page.getByText('remove-me.md')).not.toBeVisible();
    await expect(page.getByText('keep-me.md')).toBeVisible();
    await expect(page.getByText('UPLOADED (1)')).toBeVisible();
  });
});
