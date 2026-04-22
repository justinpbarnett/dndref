import { test, expect } from '@playwright/test';

test('loads Ionicons from local app assets when external CDNs are blocked', async ({ page }) => {
  const fontResponses: string[] = [];

  await page.route('**cdn.jsdelivr.net/**', (route) => route.abort());
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('Ionicons.ttf')) {
      fontResponses.push(`${response.status()} ${url}`);
    }
  });

  await page.goto('/settings');
  await page.waitForLoadState('networkidle');

  const iconState = await page.evaluate(async () => {
    await document.fonts.ready;
    const icons = Array.from(document.querySelectorAll('*')).filter((el) =>
      getComputedStyle(el).fontFamily.includes('ionicons'),
    );
    return {
      fontReady: document.fonts.check('20px ionicons'),
      iconCount: icons.length,
      iconTexts: icons.slice(0, 5).map((el) => el.textContent ?? ''),
    };
  });

  expect(fontResponses).toContain('200 http://localhost:3333/fonts/Ionicons.ttf');
  expect(fontResponses.some((entry) => entry.includes('cdn.jsdelivr.net'))).toBe(false);
  expect(iconState.fontReady).toBe(true);
  expect(iconState.iconCount).toBeGreaterThan(0);
  expect(iconState.iconTexts.some((text) => text.trim().length > 0)).toBe(true);
});
