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
  // 900px wide, taller than wide → portrait mode → 2 columns (M size).
  await page.setViewportSize({ width: 900, height: 2000 });
  await page.goto('/');
  await page.waitForSelector('text=Ready', { timeout: 20000 });

  await page.getByText('Start', { exact: true }).click();
  await page.waitForTimeout(300);

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
    await page.waitForTimeout(2100);
  }

  // Measure the bottom of the last card row, then clip screenshot to that height.
  // We don't resize the viewport because that would flip the layout from portrait (2 cols)
  // to landscape (3 cols) once height drops below width.
  const totalHeight = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-testid="entity-card"]'));
    if (!cards.length) return 900;
    const maxBottom = Math.max(...cards.map(c => {
      const r = c.getBoundingClientRect();
      return r.top + r.height;
    }));
    // Include tab bar (56px) + small bottom margin
    return Math.ceil(maxBottom) + 62;
  });

  await page.screenshot({ path: 'assets/og-image.png', clip: { x: 0, y: 0, width: 900, height: totalHeight } });
});
