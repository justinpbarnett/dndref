import { test, expect, Page } from '@playwright/test';
import {
  setupTest,
  startSession,
  pauseSession,
  stopSession,
} from '../helpers';

test.describe('session controls', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await setupTest(page);
  });

  test('idle: Start button and Ready status visible', async ({ page }) => {
    await expect(page.getByText('Start', { exact: true })).toBeVisible();
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
    await expect(page.getByText('Session not started')).toBeVisible();
  });

  test('start: Listening status, Pause and Stop appear', async ({ page }) => {
    await startSession(page);
    await expect(page.getByText('Listening', { exact: true })).toBeVisible();
    await expect(page.getByText('Pause', { exact: true })).toBeVisible();
    await expect(page.getByText('Stop', { exact: true })).toBeVisible();
    await expect(page.getByText('Start', { exact: true })).not.toBeVisible();
  });

  test('active: empty grid shows Awaiting entities', async ({ page }) => {
    await startSession(page);
    await expect(page.getByText('Awaiting entities…')).toBeVisible();
  });

  test('pause: Paused status, Resume replaces Pause', async ({ page }) => {
    await startSession(page);
    await pauseSession(page);
    await expect(page.getByText('Paused', { exact: true })).toBeVisible();
    await expect(page.getByText('Resume', { exact: true })).toBeVisible();
    await expect(page.getByText('Pause', { exact: true })).not.toBeVisible();
  });

  test('resume: back to Listening', async ({ page }) => {
    await startSession(page);
    await pauseSession(page);
    await page.getByText('Resume', { exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Listening', { exact: true })).toBeVisible();
    await expect(page.getByText('Pause', { exact: true })).toBeVisible();
  });

  test('stop: resets to idle, clears session', async ({ page }) => {
    await startSession(page);
    await stopSession(page);
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
    await expect(page.getByText('Start', { exact: true })).toBeVisible();
    await expect(page.getByText('Stop', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Session not started')).toBeVisible();
  });
});
