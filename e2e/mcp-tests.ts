import * as fs from "fs";
import * as path from "path";

import { chromium, ConsoleMessage } from "playwright";

import { runTest, TestContext, TestResult } from "./mcp/runner";
import {
  testAppLoads,
  testNavigateToSettings,
  testCardSizeSwitching,
  testThemeSwitching,
  testSttProvider,
  testDataSourceToggles,
  testSampleWorldEntities,
} from "./mcp/tests";

const BASE_URL = "http://localhost:3333";
const SCREENSHOT_DIR = "e2e/mcp-test-screenshots";

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
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err: Error) => consoleErrors.push(`[Page Error] ${err.message}`));

  const testCtx: TestContext = { page, consoleErrors, screenshotDir: SCREENSHOT_DIR, baseUrl: BASE_URL };
  const run = (name: string, testFn: (ctx: TestContext) => Promise<any>) =>
    runTest(results, name, () => {
      consoleErrors.length = 0;
      return testFn(testCtx);
    });

  try {
    await run("Test 1: App loads correctly", testAppLoads);
    await run("Test 2: Navigate to Settings", testNavigateToSettings);
    await run("Test 3: Card size switching", testCardSizeSwitching);
    await run("Test 4: Theme switching", testThemeSwitching);
    await run("Test 5: STT provider selection", testSttProvider);
    await run("Test 6: Data source toggles", testDataSourceToggles);
    await run("Test 7: Sample world entities", testSampleWorldEntities);
  } finally {
    await browser.close();
  }

  generateReport();
}

function generateReport() {
  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;

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
      for (const err of result.errors.slice(0, 10)) report += `  - ${err.replace(/\n/g, " ")}\n`;
      if (result.errors.length > 10) report += `  - ... and ${result.errors.length - 10} more\n`;
    }
    report += `\n---\n\n`;
  }

  report += `## Overall Result\n\n${failCount === 0 ? "✅ ALL TESTS PASSED" : `⚠️ ${failCount} TEST(S) FAILED`}\n`;

  fs.writeFileSync("e2e/mcp-test-report.md", report);
  console.log(`\n📊 Test report saved to: e2e/mcp-test-report.md`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}/`);
}

runTests().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});
