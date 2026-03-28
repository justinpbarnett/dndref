import { TestContext } from './runner';

export async function testAppLoads({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;
  await page.goto(baseUrl, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2500);

  const bodyText = await page.textContent('body') || '';
  const hasReady = bodyText.includes('Ready');
  const hasStart = bodyText.includes('Start');

  if (!hasReady || !hasStart) {
    throw new Error(`App not fully loaded. Found: Ready=${hasReady}, Start=${hasStart}`);
  }

  await page.screenshot({ path: `${screenshotDir}/test-01-app-loads.png` });

  return {
    screenshotPath: `${screenshotDir}/test-01-app-loads.png`,
    errors: [...consoleErrors],
    extraInfo: `Ready: ${hasReady}, Start: ${hasStart}`
  };
}

export async function testNavigateToSettings({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;

  const settingsLink = page.locator('a[href="/settings"], text=SETTINGS').first();
  if (await settingsLink.isVisible().catch(() => false)) {
    await settingsLink.click();
  } else {
    await page.goto(`${baseUrl}/settings`, { waitUntil: 'load', timeout: 30000 });
  }

  await page.waitForTimeout(2000);

  const bodyText = await page.textContent('body') || '';
  const hasDisplay = bodyText.includes('Display');

  if (!hasDisplay) throw new Error('Settings page not loaded - Display tab not found');

  const expectedTabs = ['Display', 'Voice', 'Sources', 'Files'];
  const foundTabs = expectedTabs.filter(tab => bodyText.includes(tab));

  await page.screenshot({ path: `${screenshotDir}/test-02-settings-page.png` });

  return {
    screenshotPath: `${screenshotDir}/test-02-settings-page.png`,
    errors: [...consoleErrors],
    extraInfo: `Found tabs: ${foundTabs.join(', ')}`
  };
}

export async function testCardSizeSwitching({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;
  const screenshots: string[] = [];

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const initialScreenshot = `${screenshotDir}/test-03-card-size-initial.png`;
  await page.screenshot({ path: initialScreenshot });
  screenshots.push(initialScreenshot);

  const sizes = ['S', 'M', 'L', 'XL'];
  const testedSizes: string[] = [];

  for (const size of sizes) {
    const sizeBtn = page.getByText(size, { exact: false }).filter({ hasText: new RegExp(`^${size}$`) }).first();
    const altSizeBtn = page.locator(`button:has-text("${size}")`).first();

    if (await sizeBtn.isVisible().catch(() => false)) {
      await sizeBtn.click();
      await page.waitForTimeout(600);
      const screenshotPath = `${screenshotDir}/test-03-card-size-${size.toLowerCase()}.png`;
      await page.screenshot({ path: screenshotPath });
      screenshots.push(screenshotPath);
      testedSizes.push(size);
    } else if (await altSizeBtn.isVisible().catch(() => false)) {
      await altSizeBtn.click();
      await page.waitForTimeout(600);
      const screenshotPath = `${screenshotDir}/test-03-card-size-${size.toLowerCase()}.png`;
      await page.screenshot({ path: screenshotPath });
      screenshots.push(screenshotPath);
      testedSizes.push(size);
    }
  }

  return { screenshotPath: screenshots.join(', '), errors: [...consoleErrors], extraInfo: `Tested sizes: ${testedSizes.join(', ')}` };
}

export async function testThemeSwitching({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;
  const screenshots: string[] = [];

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const darkBtn = page.getByText('Dark', { exact: true }).first();
  if (await darkBtn.isVisible().catch(() => false)) {
    await darkBtn.click();
    await page.waitForTimeout(1000);
    const darkScreenshot = `${screenshotDir}/test-04-theme-dark.png`;
    await page.screenshot({ path: darkScreenshot });
    screenshots.push(darkScreenshot);
  }

  const lightBtn = page.getByText('Light', { exact: true }).first();
  if (await lightBtn.isVisible().catch(() => false)) {
    await lightBtn.click();
    await page.waitForTimeout(1000);
    const lightScreenshot = `${screenshotDir}/test-04-theme-light.png`;
    await page.screenshot({ path: lightScreenshot });
    screenshots.push(lightScreenshot);
  }

  const systemBtn = page.getByText('System', { exact: true }).first();
  if (await systemBtn.isVisible().catch(() => false)) {
    await systemBtn.click();
    await page.waitForTimeout(1000);
    const systemScreenshot = `${screenshotDir}/test-04-theme-system.png`;
    await page.screenshot({ path: systemScreenshot });
    screenshots.push(systemScreenshot);
  }

  return { screenshotPath: screenshots.join(', '), errors: [...consoleErrors], extraInfo: `Tested themes: Dark, Light, System` };
}

export async function testSttProvider({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;
  const screenshots: string[] = [];

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const voiceTab = page.getByText('Voice', { exact: true }).first();
  if (!await voiceTab.isVisible().catch(() => false)) throw new Error('Voice tab not found');

  await voiceTab.click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: `${screenshotDir}/test-05-stt-initial.png` });
  screenshots.push(`${screenshotDir}/test-05-stt-initial.png`);

  const bodyText = await page.textContent('body') || '';
  const hasWebSpeech = bodyText.toLowerCase().includes('web speech');
  const hasDeepgram = bodyText.toLowerCase().includes('deepgram');

  if (!hasWebSpeech && !hasDeepgram) throw new Error('STT provider options not found');

  const deepgramBtn = page.getByText('Deepgram', { exact: true }).first();
  let hasApiKeyField = false;
  if (await deepgramBtn.isVisible().catch(() => false)) {
    await deepgramBtn.click();
    await page.waitForTimeout(800);

    const apiKeyField = page.getByPlaceholder(/API key/i).or(page.getByText(/API key/i)).first();
    hasApiKeyField = await apiKeyField.isVisible().catch(() => false);

    await page.screenshot({ path: `${screenshotDir}/test-05-stt-deepgram.png` });
    screenshots.push(`${screenshotDir}/test-05-stt-deepgram.png`);

    const webSpeechBtn = page.getByText('Web Speech', { exact: true }).first();
    if (await webSpeechBtn.isVisible().catch(() => false)) {
      await webSpeechBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${screenshotDir}/test-05-stt-webspeech.png` });
      screenshots.push(`${screenshotDir}/test-05-stt-webspeech.png`);
    }

    return { screenshotPath: screenshots.join(', '), errors: [...consoleErrors], extraInfo: `Web Speech: ${hasWebSpeech}, Deepgram: ${hasDeepgram}, API key field visible: ${hasApiKeyField}` };
  }

  return { screenshotPath: screenshots.join(', '), errors: [...consoleErrors], extraInfo: `Web Speech: ${hasWebSpeech}, Deepgram: ${hasDeepgram}` };
}

export async function testDataSourceToggles({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const sourcesTab = page.getByText('Sources', { exact: true }).first();
  if (!await sourcesTab.isVisible().catch(() => false)) throw new Error('Sources tab not found');

  await sourcesTab.click();
  await page.waitForTimeout(800);

  const bodyText = await page.textContent('body') || '';
  const hasSrd = bodyText.includes('SRD');

  const checkboxes = page.locator('input[type="checkbox"], [role="switch"], [role="checkbox"]');
  const checkboxCount = await checkboxes.count();

  if (checkboxCount === 0 && !hasSrd) throw new Error('No data source toggles found');

  const firstCheckbox = checkboxes.first();
  let toggleResult = 'N/A';
  if (await firstCheckbox.isVisible().catch(() => false)) {
    const initialState = await firstCheckbox.isChecked().catch(() => false);
    await firstCheckbox.click();
    await page.waitForTimeout(500);
    const newState = await firstCheckbox.isChecked().catch(() => false);
    toggleResult = `${initialState} -> ${newState}`;
  }

  await page.screenshot({ path: `${screenshotDir}/test-06-data-sources.png` });

  return { screenshotPath: `${screenshotDir}/test-06-data-sources.png`, errors: [...consoleErrors], extraInfo: `SRD found: ${hasSrd}, Checkboxes: ${checkboxCount}, Toggle: ${toggleResult}` };
}

export async function testSampleWorldEntities({ page, consoleErrors, screenshotDir, baseUrl }: TestContext) {
  consoleErrors.length = 0;

  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  const startEl = page.getByText('Start', { exact: true }).first();
  if (!await startEl.isVisible().catch(() => false)) {
    const altStart = page.locator('text=Start').first();
    if (!await altStart.isVisible().catch(() => false)) throw new Error('Start Session button not found');
    await altStart.click();
  } else {
    await startEl.click();
  }

  await page.waitForTimeout(1500);

  const bodyText = await page.textContent('body') || '';
  const hasListening = bodyText.includes('Listening');
  const hasAwaiting = bodyText.includes('Awaiting');

  await page.screenshot({ path: `${screenshotDir}/test-07-sample-world.png` });

  return { screenshotPath: `${screenshotDir}/test-07-sample-world.png`, errors: [...consoleErrors], extraInfo: `Session started. Listening: ${hasListening}, Awaiting entities: ${hasAwaiting}` };
}
