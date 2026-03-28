import { Page, ConsoleMessage } from 'playwright';

export interface TestContext {
  page: Page;
  consoleErrors: string[];
  screenshotDir: string;
  baseUrl: string;
}

export interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  screenshotPath?: string;
  errors: string[];
  duration: number;
  errorMessage?: string;
}

export async function runTest(
  results: TestResult[],
  name: string,
  testFn: () => Promise<{ screenshotPath?: string; errors: string[]; extraInfo?: string }>
): Promise<void> {
  const startTime = Date.now();
  const consoleErrors: string[] = [];
  console.log(`\n🔄 Running: ${name}`);

  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, status: 'PASS', screenshotPath: result.screenshotPath, errors: result.errors, duration });
    console.log(`✅ ${name} - PASS (${duration}ms)`);
    if (result.extraInfo) console.log(`   ℹ️  ${result.extraInfo}`);
    if (result.errors.length > 0) console.log(`   ⚠️  ${result.errors.length} console error(s) found`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, status: 'FAIL', errors: consoleErrors, duration, errorMessage });
    console.log(`❌ ${name} - FAIL (${duration}ms)`);
    console.log(`   Error: ${errorMessage}`);
  }
}
