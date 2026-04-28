import fs from 'fs';

export async function runDiscovery({ chromium, logFile }) {
  console.log('\n=== VVD.WORLD SCRAPER -- DISCOVERY MODE ===\n');
  console.log('1. A browser window will open.');
  console.log('2. Log in to vvd.world.');
  console.log('3. Navigate to your world. Click through several entity pages');
  console.log('   (characters, locations, items, etc.).');
  console.log('4. Come back here and press Ctrl+C when done.\n');
  console.log('API calls will be logged to:', logFile, '\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  const apiLog = [];

  page.on('response', async (response) => {
    const url = response.url();
    const method = response.request().method();
    const status = response.status();
    const contentType = response.headers()['content-type'] ?? '';

    if (!contentType.includes('application/json')) return;
    if (url.includes('/_next/') || url.includes('/static/')) return;

    try {
      const body = await response.json();
      const entry = { url, method, status, body };
      apiLog.push(entry);
      console.log(`[API] ${method} ${status} ${url}`);
    } catch {
      // body wasn't parseable JSON, skip
    }
  });

  await page.goto('https://vvd.world');

  process.on('SIGINT', async () => {
    console.log(`\nCaptured ${apiLog.length} API calls. Saving to ${logFile}...`);
    fs.writeFileSync(logFile, JSON.stringify(apiLog, null, 2));
    console.log('Done. Run with --export to extract world data.\n');

    const endpoints = [...new Set(apiLog.map((entry) => {
      const url = new URL(entry.url);
      return `${entry.method} ${url.pathname}`;
    }))];
    console.log('Unique endpoints captured:');
    endpoints.forEach((endpoint) => console.log(' ', endpoint));

    await browser.close();
    process.exit(0);
  });

  await new Promise(() => {});
}
