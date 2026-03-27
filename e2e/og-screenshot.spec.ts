import * as fs from 'fs';
import * as path from 'path';
import { test, Page } from '@playwright/test';

const IONICONS_TTF = path.join(
  __dirname,
  '../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf',
);

async function setup(page: Page) {
  await page.addInitScript(() => {
    let recognition: any = null;
    class MockSpeechRecognition {
      continuous = false; interimResults = false; lang = 'en-US';
      onresult: any = null; onerror: any = null; onend: any = null;
      start() { recognition = this; }
      abort() { this.onend?.(); }
    }
    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    (window as any).__speak = (text: string) => {
      if (!recognition?.onresult) return false;
      recognition.onresult({
        resultIndex: 0,
        results: [Object.assign([{ transcript: text }], { isFinal: true })],
      });
      return true;
    };
  });
  await page.route('**/cdn.jsdelivr.net/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'font/ttf', body: fs.readFileSync(IONICONS_TTF) });
  });
  await page.route('**open5e**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }) });
  });
}

test('og image', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto('/');
  await page.waitForSelector('text=Ready', { timeout: 20000 });

  // Start session
  await page.getByText('Start', { exact: true }).click();
  await page.waitForTimeout(300);

  // Populate with a varied mix of entity types across 2 columns
  const phrases = [
    'Valdrath the Undying speaks',
    'we entered Ironspire through the gate',
    'Malachar the Grey was brought before us',
    'Lady Seraphine Voss delivered her report',
    'Gorm Ironfist showed us the blueprints',
    'the Obsidian Compact moves against us',
  ];

  for (const phrase of phrases) {
    await page.evaluate((t) => (window as any).__speak(t), phrase);
    await page.waitForTimeout(2500);
  }

  // Pin Valdrath so there's visual variety
  const valdrath = page.locator('[data-testid="entity-card"]').filter({ hasText: 'Valdrath the Undying' });
  await valdrath.locator('[aria-label="Pin"]').click();
  await page.waitForTimeout(400);

  await page.screenshot({ path: 'assets/og-image.png' });
});
