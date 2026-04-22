import { test, expect } from '@playwright/test';

test('renders Ionicons from local app assets when external CDNs are blocked', async ({ page }) => {
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
      Array.from(el.childNodes).some((node) =>
        node.nodeType === Node.TEXT_NODE && /[\uf000-\uf8ff]/.test(node.textContent ?? ''),
      ),
    );
    const fontFaces: string[] = [];
    document.fonts.forEach((font) => {
      if (font.family.includes('ionicons')) fontFaces.push(font.status);
    });
    return {
      fontFaces,
      iconCount: icons.length,
      iconFonts: icons.slice(0, 5).map((el) => getComputedStyle(el).fontFamily),
      iconTexts: icons.slice(0, 5).map((el) => el.textContent ?? ''),
    };
  });

  expect(fontResponses).toContain('200 http://localhost:3333/fonts/Ionicons.ttf');
  expect(fontResponses.some((entry) => entry.includes('cdn.jsdelivr.net'))).toBe(false);
  expect(iconState.fontFaces).toContain('loaded');
  expect(iconState.iconCount).toBeGreaterThan(0);
  expect(iconState.iconFonts.some((fontFamily) => fontFamily.includes('ionicons'))).toBe(true);
  expect(iconState.iconTexts.some((text) => text.trim().length > 0)).toBe(true);
});
