import * as fs from 'fs';
import * as path from 'path';
import { test, expect, Page } from '@playwright/test';

// ── Speech recognition mock ───────────────────────────────────────────────────
//
// Injected via addInitScript before each navigation. Replaces the browser's
// SpeechRecognition with a controllable stub that exposes window.__speak(text)
// for triggering transcription events from test code.

async function injectSpeechMock(page: Page) {
  await page.addInitScript(() => {
    let recognition: any = null;

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = 'en-US';
      onresult: ((e: any) => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        recognition = this;
      }

      abort() {
        // Fire onend so the provider's restart logic runs (and skips, since active=false)
        this.onend?.();
      }
    }

    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;

    // Simulate a final speech result. Returns false if recognition not yet started.
    (window as any).__speak = (text: string): boolean => {
      if (!recognition?.onresult) return false;
      recognition.onresult({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: text }], { isFinal: true }),
        ],
      });
      return true;
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Serve Ionicons font locally to avoid CDN round-trips blocking networkidle.
const IONICONS_TTF = path.join(
  __dirname,
  '../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf',
);

async function interceptFonts(page: Page) {
  await page.route('**/cdn.jsdelivr.net/**', async (route) => {
    const body = fs.readFileSync(IONICONS_TTF);
    await route.fulfill({ status: 200, contentType: 'font/ttf', body });
  });
}

// SRD is enabled by default and makes real API calls. Return empty results so
// entity loading completes immediately, leaving only the sample world entities.
async function interceptExternalApis(page: Page) {
  await page.route('**open5e**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
    });
  });
}

async function waitForApp(page: Page) {
  await page.waitForLoadState('load');
  // Wait for session controls to confirm React has hydrated
  await page.waitForSelector('text=Ready', { timeout: 20000 });
}

async function waitForSettings(page: Page) {
  await page.waitForLoadState('load');
  await page.waitForSelector('text=Display', { timeout: 20000 });
}

async function speak(page: Page, text: string) {
  const ok = await page.evaluate((t) => (window as any).__speak(t), text);
  if (!ok) throw new Error(`speak() failed -- SpeechRecognition not active. text: "${text}"`);
}

async function startSession(page: Page) {
  await page.getByText('Start', { exact: true }).click();
  await page.waitForTimeout(300);
}

async function pauseSession(page: Page) {
  await page.getByText('Pause', { exact: true }).click();
  await page.waitForTimeout(300);
}

async function stopSession(page: Page) {
  await page.getByText('Stop', { exact: true }).click();
  await page.waitForSelector('text=Ready', { timeout: 5000 });
}

// Entity detection runs every 2000 ms. Always wait at least this long after
// speaking before asserting card presence.
const DETECT_WAIT_MS = 2500;

// ── Session controls ──────────────────────────────────────────────────────────

test.describe('session controls', () => {
  test.beforeEach(async ({ page }) => {
    await injectSpeechMock(page);
    await interceptFonts(page);
    await interceptExternalApis(page);
    await page.goto('/');
    await waitForApp(page);
  });

  test('idle: Start button and Ready status visible', async ({ page }) => {
    await expect(page.getByText('Start', { exact: true })).toBeVisible();
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
    await expect(page.getByText('Session not started')).toBeVisible();
  });

  test('start: Listening status, Pause and Stop appear', async ({ page }) => {
    await startSession(page);
    await expect(page.getByText('Listening', { exact: true })).toBeVisible();
    await expect(page.getByText('Pause', { exact: true })).toBeVisible();
    await expect(page.getByText('Stop', { exact: true })).toBeVisible();
    await expect(page.getByText('Start', { exact: true })).not.toBeVisible();
  });

  test('active: empty grid shows Awaiting entities', async ({ page }) => {
    await startSession(page);
    await expect(page.getByText('Awaiting entities…')).toBeVisible();
  });

  test('pause: Paused status, Resume replaces Pause', async ({ page }) => {
    await startSession(page);
    await pauseSession(page);
    await expect(page.getByText('Paused', { exact: true })).toBeVisible();
    await expect(page.getByText('Resume', { exact: true })).toBeVisible();
    await expect(page.getByText('Pause', { exact: true })).not.toBeVisible();
  });

  test('resume: back to Listening', async ({ page }) => {
    await startSession(page);
    await pauseSession(page);
    await page.getByText('Resume', { exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Listening', { exact: true })).toBeVisible();
    await expect(page.getByText('Pause', { exact: true })).toBeVisible();
  });

  test('stop: resets to idle, clears session', async ({ page }) => {
    await startSession(page);
    await stopSession(page);
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
    await expect(page.getByText('Start', { exact: true })).toBeVisible();
    await expect(page.getByText('Stop', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Session not started')).toBeVisible();
  });
});

// ── Voice entity detection ────────────────────────────────────────────────────

test.describe('voice entity detection', () => {
  test.beforeEach(async ({ page }) => {
    await injectSpeechMock(page);
    await interceptFonts(page);
    await interceptExternalApis(page);
    await page.goto('/');
    await waitForApp(page);
    await startSession(page);
  });

  test('entity full name in speech surfaces a card', async ({ page }) => {
    await speak(page, 'Valdrath the Undying approaches the throne');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
  });

  test('entity alias triggers the canonical card', async ({ page }) => {
    await speak(page, 'we entered Ironspire through the eastern gate');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Ironspire Fortress')).toBeVisible();
  });

  test('multiple entities in one utterance surface multiple cards', async ({ page }) => {
    await speak(page, 'Valdrath summoned Malachar to the fortress');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
    await expect(page.getByText('Malachar the Grey')).toBeVisible();
  });

  test('unknown words produce no cards', async ({ page }) => {
    await speak(page, 'the tavern keeper poured us another round');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Awaiting entities…')).toBeVisible();
    await expect(page.getByTestId('entity-card')).toHaveCount(0);
  });

  test('same entity mentioned twice produces only one card', async ({ page }) => {
    await speak(page, 'Valdrath spoke first');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await speak(page, 'then Valdrath spoke again');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toHaveCount(1);
  });

  test('subsequent utterances add to existing cards', async ({ page }) => {
    await speak(page, 'Valdrath on the throne');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await speak(page, 'Seraphine arrived at the keep');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
    await expect(page.getByText('Lady Seraphine Voss')).toBeVisible();
  });

  test('text added while paused is not detected after resume', async ({ page }) => {
    // Establish a baseline card while active
    await speak(page, 'Valdrath is watching');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();

    // Pause, then inject speech that mentions a second entity
    await pauseSession(page);
    await speak(page, 'Malachar appeared in the dungeon');

    // Resume -- processedUpToRef resets, so paused speech is skipped
    await page.getByText('Resume', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.waitForTimeout(DETECT_WAIT_MS);

    // Malachar card should NOT appear (detected while paused, skipped on resume)
    await expect(page.getByText('Malachar the Grey')).not.toBeVisible();
    // Valdrath still there
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
  });

  test('stop clears all cards; re-start detects fresh entities', async ({ page }) => {
    await speak(page, 'Valdrath and Malachar confer');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await stopSession(page);
    await expect(page.getByText('Valdrath the Undying')).not.toBeVisible();

    await startSession(page);
    await speak(page, 'Seraphine briefed us on the mission');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Lady Seraphine Voss')).toBeVisible();
    // Old entities cleared by stop
    await expect(page.getByText('Valdrath the Undying')).not.toBeVisible();
  });
});

// ── Card interactions ─────────────────────────────────────────────────────────

test.describe('card interactions', () => {
  test.beforeEach(async ({ page }) => {
    await injectSpeechMock(page);
    await interceptFonts(page);
    await interceptExternalApis(page);
    await page.goto('/');
    await waitForApp(page);
    await startSession(page);
    await speak(page, 'Valdrath the Undying speaks');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByTestId('entity-card')).toHaveCount(1);
  });

  test('dismiss removes the card', async ({ page }) => {
    const card = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await card.locator('[aria-label="Dismiss"]').click();
    await expect(page.getByText('Valdrath the Undying')).not.toBeVisible();
    await expect(page.getByTestId('entity-card')).toHaveCount(0);
  });

  test('pin button toggles to Unpin after clicking', async ({ page }) => {
    const card = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await card.locator('[aria-label="Pin"]').click();
    await expect(card.locator('[aria-label="Unpin"]')).toBeVisible();
  });

  test('unpin returns card to unpinned state', async ({ page }) => {
    const card = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await card.locator('[aria-label="Pin"]').click();
    await card.locator('[aria-label="Unpin"]').click();
    await expect(card.locator('[aria-label="Pin"]')).toBeVisible();
  });

  test('dismissed entity re-appears when spoken again', async ({ page }) => {
    const card = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await card.locator('[aria-label="Dismiss"]').click();
    await expect(page.getByText('Valdrath the Undying')).not.toBeVisible();

    await speak(page, 'Valdrath returned to the chamber');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
  });

  test('dismissing one card leaves others intact', async ({ page }) => {
    // Add a second card
    await speak(page, 'Seraphine arrived to brief us');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByTestId('entity-card')).toHaveCount(2);

    // Dismiss Valdrath
    const valdrath = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await valdrath.locator('[aria-label="Dismiss"]').click();

    await expect(page.getByText('Valdrath the Undying')).not.toBeVisible();
    await expect(page.getByText('Lady Seraphine Voss')).toBeVisible();
    await expect(page.getByTestId('entity-card')).toHaveCount(1);
  });
});

// ── Card eviction (max 6) ─────────────────────────────────────────────────────

test.describe('card eviction', () => {
  test.beforeEach(async ({ page }) => {
    await injectSpeechMock(page);
    await interceptFonts(page);
    await interceptExternalApis(page);
    await page.goto('/');
    await waitForApp(page);
    await startSession(page);
  });

  test('all 5 sample entities fit within the 6-card limit', async ({ page }) => {
    for (const phrase of [
      'Valdrath on the throne',
      'entered Ironspire today',
      'Malachar in the dungeon',
      'Seraphine arrived',
      'Gorm the blacksmith',
    ]) {
      await speak(page, phrase);
      await page.waitForTimeout(DETECT_WAIT_MS);
    }
    await expect(page.getByTestId('entity-card')).toHaveCount(5);
  });

  test('pinned cards survive eviction pressure', async ({ page }) => {
    await speak(page, 'Valdrath is here');
    await page.waitForTimeout(DETECT_WAIT_MS);

    // Pin Valdrath
    const valdrath = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await valdrath.locator('[aria-label="Pin"]').click();

    // Add remaining entities
    for (const phrase of [
      'entered Ironspire',
      'Malachar in chains',
      'Seraphine arrived',
      'Gorm showed blueprints',
    ]) {
      await speak(page, phrase);
      await page.waitForTimeout(DETECT_WAIT_MS);
    }

    // Pinned Valdrath should survive regardless of order
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

test.describe('edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await injectSpeechMock(page);
    await interceptFonts(page);
    await interceptExternalApis(page);
    await page.goto('/');
    await waitForApp(page);
  });

  test('rapid start/stop cycle does not corrupt state', async ({ page }) => {
    await startSession(page);
    await stopSession(page);
    await startSession(page);
    await stopSession(page);
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
    await expect(page.getByText('Start', { exact: true })).toBeVisible();
    await expect(page.getByTestId('entity-card')).toHaveCount(0);
  });

  test('pause/resume cycle preserves existing cards', async ({ page }) => {
    await startSession(page);
    await speak(page, 'Valdrath watches from the throne');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();

    await pauseSession(page);
    await page.getByText('Resume', { exact: true }).click();
    await page.waitForTimeout(300);

    // Card still there after pause/resume
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
  });

  test('entity detection works after dismiss and re-mention in same session', async ({ page }) => {
    await startSession(page);
    await speak(page, 'Valdrath at the throne');
    await page.waitForTimeout(DETECT_WAIT_MS);

    const card = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await card.locator('[aria-label="Dismiss"]').click();
    await page.waitForTimeout(300);

    await speak(page, 'Valdrath returned to the fortress');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await expect(page.getByText('Valdrath the Undying')).toBeVisible();
  });

  test('multiple sessions accumulate fresh transcripts', async ({ page }) => {
    // First session: mention Valdrath
    await startSession(page);
    await speak(page, 'Valdrath sits');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await stopSession(page);

    // Second session: mention Seraphine only
    await startSession(page);
    await speak(page, 'Seraphine entered');
    await page.waitForTimeout(DETECT_WAIT_MS);

    await expect(page.getByText('Lady Seraphine Voss')).toBeVisible();
    // Valdrath should NOT reappear (second session started fresh)
    await expect(page.getByText('Valdrath the Undying')).not.toBeVisible();
  });
});

// ── Screenshots ───────────────────────────────────────────────────────────────

test.describe('screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await injectSpeechMock(page);
    await interceptFonts(page);
    await interceptExternalApis(page);
  });

  test('idle state', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await page.screenshot({ path: 'e2e/screenshots/app-01-idle.png' });
  });

  test('active session with cards', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await startSession(page);
    await speak(page, 'Valdrath summoned Malachar and Seraphine to Ironspire');
    await page.waitForTimeout(DETECT_WAIT_MS);
    await page.screenshot({ path: 'e2e/screenshots/app-02-active-cards.png' });
  });

  test('pinned card visual', async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
    await startSession(page);
    await speak(page, 'Valdrath is here');
    await page.waitForTimeout(DETECT_WAIT_MS);
    const card = page.getByTestId('entity-card').filter({ hasText: 'Valdrath the Undying' });
    await card.locator('[aria-label="Pin"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'e2e/screenshots/app-03-pinned.png' });
  });

  test('settings page', async ({ page }) => {
    await page.goto('/settings');
    await waitForSettings(page);
    await page.screenshot({ path: 'e2e/screenshots/app-04-settings.png' });
  });
});
