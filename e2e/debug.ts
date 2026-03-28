import { chromium } from 'playwright';

async function debugPage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3333', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Take a screenshot
  await page.screenshot({ path: 'e2e/debug-home.png', fullPage: true });

  // Get page text
  const bodyText = await page.textContent('body');
  console.log('=== PAGE TEXT (first 2000 chars) ===');
  console.log(bodyText?.slice(0, 2000));

  // Find all buttons
  const buttons = await page.locator('button').all();
  console.log('\n=== BUTTONS ===');
  for (const btn of buttons) {
    const text = await btn.textContent();
    const aria = await btn.getAttribute('aria-label');
    console.log(`Button: text="${text?.slice(0, 50)}" aria-label="${aria}"`);
  }

  // Find all links
  const links = await page.locator('a').all();
  console.log('\n=== LINKS ===');
  for (const link of links) {
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    console.log(`Link: text="${text?.slice(0, 50)}" href="${href}"`);
  }

  // Find all headings
  const headings = await page.locator('h1, h2, h3, h4').all();
  console.log('\n=== HEADINGS ===');
  for (const h of headings) {
    const text = await h.textContent();
    console.log(`${await h.evaluate(el => el.tagName)}: "${text?.slice(0, 50)}"`);
  }

  // Navigate to settings
  console.log('\n=== NAVIGATING TO SETTINGS ===');
  await page.goto('http://localhost:3333/settings', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e/debug-settings.png', fullPage: true });

  const settingsText = await page.textContent('body');
  console.log('\n=== SETTINGS PAGE TEXT (first 2000 chars) ===');
  console.log(settingsText?.slice(0, 2000));

  // Find tabs
  const tabs = await page.locator('[role="tab"], button, a').all();
  console.log('\n=== SETTINGS ELEMENTS ===');
  for (const tab of tabs.slice(0, 20)) {
    const text = await tab.textContent();
    const role = await tab.getAttribute('role');
    if (text && text.trim()) {
      console.log(`Element: text="${text.trim().slice(0, 50)}" role="${role}"`);
    }
  }

  await browser.close();
  console.log('\n=== DEBUG COMPLETE ===');
  console.log('Screenshots saved: e2e/debug-home.png, e2e/debug-settings.png');
}

debugPage().catch(err => {
  console.error('Debug failed:', err);
  process.exit(1);
});
