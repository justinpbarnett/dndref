import { test } from "@playwright/test";

import { openTableSession } from "./helpers";

test("og image", async ({ page }) => {
  // 900px wide, taller than wide → portrait mode → 2 columns (M size).
  // The viewport is set before the app loads, so the first layout is the one we shoot.
  await page.setViewportSize({ width: 900, height: 2000 });
  const table = await openTableSession(page);

  const phrases = [
    "Valdrath the Undying speaks",
    "we entered Ironspire through the gate",
    "Malachar the Grey was brought before us",
    "Lady Seraphine Voss delivered her report",
    "Gorm Ironfist showed us the blueprints",
    "the Obsidian Compact moves against us",
  ];

  for (const phrase of phrases) {
    await table.say(phrase);
  }

  // Measure the bottom of the last card row, then clip screenshot to that height.
  // We don't resize the viewport because that would flip the layout from portrait (2 cols)
  // to landscape (3 cols) once height drops below width.
  const totalHeight = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-testid="entity-card"]'));
    if (!cards.length) return 900;
    const maxBottom = Math.max(
      ...cards.map((c) => {
        const r = c.getBoundingClientRect();
        return r.top + r.height;
      }),
    );
    // Include tab bar (56px) + small bottom margin
    return Math.ceil(maxBottom) + 62;
  });

  await page.screenshot({ path: "assets/og-image.png", clip: { x: 0, y: 0, width: 900, height: totalHeight } });
});
