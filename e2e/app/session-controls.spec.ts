import { test, expect, Page } from '@playwright/test';

import {
  emitSpeechEnd,
  emitSpeechError,
  failNextSpeechStart,
  getSpeechStartCount,
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

  test('rapid duplicate Start creates only one speech recognizer start', async ({ page }) => {
    const startButton = page.getByText('Start', { exact: true });
    await startButton.click();
    await page.getByText('Start', { exact: true }).click({ timeout: 100 }).catch(() => undefined);
    await expect(page.getByText('Listening', { exact: true })).toBeVisible();

    await expect.poll(() => getSpeechStartCount(page)).toBe(1);
  });

  test('start failure stays out of Listening and allows retry', async ({ page }) => {
    await failNextSpeechStart(page);

    await page.getByText('Start', { exact: true }).click();
    await expect(page.getByText('Mic Error', { exact: true })).toBeVisible();
    await expect(page.getByText('Listening', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Start', { exact: true })).toBeVisible();

    await page.getByText('Start', { exact: true }).click();
    await expect(page.getByText('Listening', { exact: true })).toBeVisible();

    const startCount = await getSpeechStartCount(page);
    expect(startCount).toBe(2);
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

  test('ignored speech errors do not tear down the mic', async ({ page }) => {
    await startSession(page);
    await emitSpeechError(page, 'no-speech');
    await page.waitForTimeout(150);

    await expect(page.getByText('Listening', { exact: true })).toBeVisible();
    await expect(page.getByText('Mic Error', { exact: true })).not.toBeVisible();
  });

  test('fatal speech errors stop restart attempts and show recovery controls', async ({ page }) => {
    await startSession(page);
    await emitSpeechError(page);
    await expect(page.getByText('Mic Error', { exact: true })).toBeVisible();
    await expect(page.getByText('Resume', { exact: true })).toBeVisible();

    await emitSpeechEnd(page);
    await page.waitForTimeout(300);
    const startCount = await getSpeechStartCount(page);
    expect(startCount).toBe(1);
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
