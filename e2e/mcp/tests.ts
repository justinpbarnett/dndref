import { TestContext } from "./runner";

async function saveScreenshot(page: TestContext["page"], screenshots: string[], path: string) {
  await page.screenshot({ path });
  screenshots.push(path);
}

async function gotoSettingsPage(page: TestContext["page"], baseUrl: string) {
  await page.goto(`${baseUrl}/settings`, { waitUntil: "load" });
  await page.waitForTimeout(2000);
}

function testResult(consoleErrors: string[], screenshotPath: string, extraInfo: string) {
  return { screenshotPath, errors: [...consoleErrors], extraInfo };
}

export async function testAppLoads({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;
  await page.goto(baseUrl, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(2500);

  const bodyText = (await page.textContent("body")) || "";
  const hasReady = bodyText.includes("Ready");
  const hasStart = bodyText.includes("Start");

  if (!hasReady || !hasStart) {
    throw new Error(`App not fully loaded. Found: Ready=${hasReady}, Start=${hasStart}`);
  }

  await page.screenshot({ path: `${screenshotDir}/test-01-app-loads.png` });

  return testResult(consoleErrors, `${screenshotDir}/test-01-app-loads.png`, `Ready: ${hasReady}, Start: ${hasStart}`);
}

export async function testNavigateToSettings({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;

  const settingsLink = page.locator('a[href="/settings"], text=SETTINGS').first();
  if (await settingsLink.isVisible().catch(() => false)) {
    await settingsLink.click();
  } else {
    await page.goto(`${baseUrl}/settings`, { waitUntil: "load", timeout: 30000 });
  }

  await page.waitForTimeout(2000);

  const bodyText = (await page.textContent("body")) || "";
  const hasDisplay = bodyText.includes("Display");

  if (!hasDisplay) throw new Error("Settings page not loaded - Display tab not found");

  const expectedTabs = ["Display", "Voice", "Sources", "Files"];
  const foundTabs = expectedTabs.filter((tab) => bodyText.includes(tab));

  await page.screenshot({ path: `${screenshotDir}/test-02-settings-page.png` });

  return testResult(consoleErrors, `${screenshotDir}/test-02-settings-page.png`, `Found tabs: ${foundTabs.join(", ")}`);
}

export async function testCardSizeSwitching({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;
  const screenshots: string[] = [];

  await gotoSettingsPage(page, baseUrl);

  const initialScreenshot = `${screenshotDir}/test-03-card-size-initial.png`;
  await saveScreenshot(page, screenshots, initialScreenshot);

  const sizes = ["S", "M", "L", "XL"];
  const testedSizes: string[] = [];

  for (const size of sizes) {
    const sizeBtn = page
      .getByText(size, { exact: false })
      .filter({ hasText: new RegExp(`^${size}$`) })
      .first();
    const altSizeBtn = page.locator(`button:has-text("${size}")`).first();

    const visibleButton = (await sizeBtn.isVisible().catch(() => false))
      ? sizeBtn
      : (await altSizeBtn.isVisible().catch(() => false))
        ? altSizeBtn
        : null;
    if (visibleButton) {
      await visibleButton.click();
      await page.waitForTimeout(600);
      await saveScreenshot(page, screenshots, `${screenshotDir}/test-03-card-size-${size.toLowerCase()}.png`);
      testedSizes.push(size);
    }
  }

  return testResult(consoleErrors, screenshots.join(", "), `Tested sizes: ${testedSizes.join(", ")}`);
}

export async function testThemeSwitching({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;
  const screenshots: string[] = [];

  await gotoSettingsPage(page, baseUrl);

  for (const theme of ["Dark", "Light", "System"]) {
    const button = page.getByText(theme, { exact: true }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForTimeout(1000);
      await saveScreenshot(page, screenshots, `${screenshotDir}/test-04-theme-${theme.toLowerCase()}.png`);
    }
  }

  return testResult(consoleErrors, screenshots.join(", "), `Tested themes: Dark, Light, System`);
}

export async function testSttProvider({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;
  const screenshots: string[] = [];

  await gotoSettingsPage(page, baseUrl);

  const voiceTab = page.getByText("Voice", { exact: true }).first();
  if (!(await voiceTab.isVisible().catch(() => false))) throw new Error("Voice tab not found");

  await voiceTab.click();
  await page.waitForTimeout(800);

  await saveScreenshot(page, screenshots, `${screenshotDir}/test-05-stt-initial.png`);

  const bodyText = (await page.textContent("body")) || "";
  const hasWebSpeech = bodyText.toLowerCase().includes("web speech");
  const hasDeepgram = bodyText.toLowerCase().includes("deepgram");

  if (!hasWebSpeech && !hasDeepgram) throw new Error("STT provider options not found");

  const deepgramBtn = page.getByText("Deepgram", { exact: true }).first();
  let hasApiKeyField = false;
  if (await deepgramBtn.isVisible().catch(() => false)) {
    await deepgramBtn.click();
    await page.waitForTimeout(800);

    const apiKeyField = page
      .getByPlaceholder(/API key/i)
      .or(page.getByText(/API key/i))
      .first();
    hasApiKeyField = await apiKeyField.isVisible().catch(() => false);

    await saveScreenshot(page, screenshots, `${screenshotDir}/test-05-stt-deepgram.png`);

    const webSpeechBtn = page.getByText("Web Speech", { exact: true }).first();
    if (await webSpeechBtn.isVisible().catch(() => false)) {
      await webSpeechBtn.click();
      await page.waitForTimeout(800);
      await saveScreenshot(page, screenshots, `${screenshotDir}/test-05-stt-webspeech.png`);
    }

    return testResult(
      consoleErrors,
      screenshots.join(", "),
      `Web Speech: ${hasWebSpeech}, Deepgram: ${hasDeepgram}, API key field visible: ${hasApiKeyField}`,
    );
  }

  return testResult(consoleErrors, screenshots.join(", "), `Web Speech: ${hasWebSpeech}, Deepgram: ${hasDeepgram}`);
}

export async function testDataSourceToggles({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;

  await gotoSettingsPage(page, baseUrl);

  const sourcesTab = page.getByText("Sources", { exact: true }).first();
  if (!(await sourcesTab.isVisible().catch(() => false))) throw new Error("Sources tab not found");

  await sourcesTab.click();
  await page.waitForTimeout(800);

  const bodyText = (await page.textContent("body")) || "";
  const hasSrd = bodyText.includes("SRD");

  const checkboxes = page.locator('input[type="checkbox"], [role="switch"], [role="checkbox"]');
  const checkboxCount = await checkboxes.count();

  if (checkboxCount === 0 && !hasSrd) throw new Error("No data source toggles found");

  const firstCheckbox = checkboxes.first();
  let toggleResult = "N/A";
  if (await firstCheckbox.isVisible().catch(() => false)) {
    const initialState = await firstCheckbox.isChecked().catch(() => false);
    await firstCheckbox.click();
    await page.waitForTimeout(500);
    const newState = await firstCheckbox.isChecked().catch(() => false);
    toggleResult = `${initialState} -> ${newState}`;
  }

  await page.screenshot({ path: `${screenshotDir}/test-06-data-sources.png` });

  return testResult(
    consoleErrors,
    `${screenshotDir}/test-06-data-sources.png`,
    `SRD found: ${hasSrd}, Checkboxes: ${checkboxCount}, Toggle: ${toggleResult}`,
  );
}

export async function testSampleWorldEntities({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;

  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForTimeout(2500);

  const startEl = page.getByText("Start", { exact: true }).first();
  if (!(await startEl.isVisible().catch(() => false))) {
    const altStart = page.locator("text=Start").first();
    if (!(await altStart.isVisible().catch(() => false))) throw new Error("Start Session button not found");
    await altStart.click();
  } else {
    await startEl.click();
  }

  await page.waitForTimeout(1500);

  const bodyText = (await page.textContent("body")) || "";
  const hasListening = bodyText.includes("Listening");
  const hasAwaiting = bodyText.includes("Awaiting");

  await page.screenshot({ path: `${screenshotDir}/test-07-sample-world.png` });

  return testResult(
    consoleErrors,
    `${screenshotDir}/test-07-sample-world.png`,
    `Session started. Listening: ${hasListening}, Awaiting entities: ${hasAwaiting}`,
  );
}
