import * as fs from 'fs';
import * as path from 'path';

import { chromium, Browser, Page, ConsoleMessage } from 'playwright';

import { runTest, TestContext, TestResult } from './mcp/runner';
import { testAppLoads, testNavigateToSettings, testCardSizeSwitching, testThemeSwitching, testSttProvider, testDataSourceToggles, testSampleWorldEntities } from './mcp/tests';

const BASE_URL = 'http://localhost:3333';
const SCREENSHOT_DIR = 'e2e/mcp-test-screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const results: TestResult[] = [];

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err: Error) => consoleErrors.push(`[Page Error] ${err.message}`));

  const testCtx: TestContext = { page, consoleErrors, screenshotDir: SCREENSHOT_DIR, baseUrl: BASE_URL };

  try {
    await runTest(results, 'Test 1: App loads correctly', () => testAppLoads(testCtx));
    await runTest(results, 'Test 2: Navigate to Settings', () => testNavigateToSettings(testCtx));
    await runTest(results, 'Test 3: Card size switching', () => testCardSizeSwitching(testCtx));
    await runTest(results, 'Test 4: Theme switching', () => testThemeSwitching(testCtx));
    await runTest(results, 'Test 5: STT provider selection', () => testSttProvider(testCtx));
    await runTest(results, 'Test 6: Data source toggles', () => testDataSourceToggles(testCtx));
    await runTest(results, 'Test 7: Sample world entities', () => testSampleWorldEntities(testCtx));
  } finally {
    await browser.close();
  }

  generateReport();
}

function generateReport() {
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;

  let report = `# DnD Ref MCP Test Report\n\n`;
  report += `**Date:** ${new Date().toISOString()}\n\n`;
  report += `**URL:** ${BASE_URL}\n\n`;
  report += `**Summary:** ${passCount} passed, ${failCount} failed\n\n`;
  report += `---\n\n`;

  for (const result of results) {
    report += `## ${result.name}\n\n`;
    report += `- **Status:** ${result.status}\n`;
    report += `- **Duration:** ${result.duration}ms\n`;
    if (result.screenshotPath) report += `- **Screenshot:** ${result.screenshotPath}\n`;
    if (result.errorMessage) report += `- **Error:** ${result.errorMessage}\n`;
    if (result.errors.length > 0) {
      report += `- **Console Errors:**\n`;
      for (const err of result.errors.slice(0, 10)) report += `  - ${err.replace(/\n/g, ' ')}\n`;
      if (result.errors.length > 10) report += `  - ... and ${result.errors.length - 10} more\n`;
    } else {
      report += `- **Console Errors:** None\n`;
    }
    report += `\n---\n\n`;
  }

  report += `## Summary Table\n\n`;
  report += `| Test | Status | Duration | Screenshot | Errors |\n`;
  report += `|------|--------|----------|------------|--------|\n`;
  for (const result of results) {
    const hasScreenshots = result.screenshotPath ? '✓' : '✗';
    const hasErrors = result.errors.length > 0 ? `${result.errors.length}` : '0';
    report += `| ${result.name} | ${result.status} | ${result.duration}ms | ${hasScreenshots} | ${hasErrors} |\n`;
  }

  report += `\n**Overall Result:** ${failCount === 0 ? '✅ ALL TESTS PASSED' : `⚠️ ${failCount} TEST(S) FAILED`}\n`;

  fs.writeFileSync('e2e/mcp-test-report.md', report);
  console.log(`\n📊 Test report saved to: e2e/mcp-test-report.md`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}/`);
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
