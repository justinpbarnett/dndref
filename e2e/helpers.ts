import * as fs from "fs";
import * as path from "path";

import { Page } from "@playwright/test";

export async function injectSpeechMock(page: Page) {
  await page.addInitScript(() => {
    let recognition: any = null;
    let failNextStart: Error | null = null;
    const instances: any[] = [];
    const state = {
      startCount: 0,
      abortCount: 0,
      instances,
      get activeRecognition() {
        return recognition;
      },
      failNextStart: (name = "NotAllowedError", message = "Microphone permission required") =>
        (failNextStart = new DOMException(message, name)),
      emitError: (error = "audio-capture") => recognition?.onerror?.({ error }),
      emitEnd: () => recognition?.onend?.(),
      emitSpeech(text: string): boolean {
        if (!recognition?.onresult) return false;
        recognition.onresult({
          resultIndex: 0,
          results: [Object.assign([{ transcript: text }], { isFinal: true })],
        });
        return true;
      },
    };

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "en-US";
      onresult: ((e: any) => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      onend: (() => void) | null = null;

      constructor() {
        instances.push(this);
      }

      start() {
        state.startCount += 1;
        if (failNextStart) {
          const err = failNextStart;
          failNextStart = null;
          throw err;
        }
        recognition = this;
      }

      abort() {
        state.abortCount += 1;
        this.onend?.();
      }
    }

    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    (window as any).__speechMock = state;

    (window as any).__speak = (text: string): boolean => state.emitSpeech(text);
  });
}

export async function waitForApp(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForSelector("text=Ready", { timeout: 20000 });
}

export async function waitForSettledPage(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
}

export async function gotoSettings(page: Page) {
  await page.goto("/settings");
  await page.waitForLoadState("load");
  await page.waitForSelector("text=Display", { timeout: 20000 });
}

export async function speak(page: Page, text: string) {
  const ok = await page.evaluate((t) => (window as any).__speak(t), text);
  if (!ok) throw new Error(`speak() failed -- SpeechRecognition not active. text: "${text}"`);
}

export async function failNextSpeechStart(
  page: Page,
  name = "NotAllowedError",
  message = "Microphone permission required",
) {
  await page.evaluate(
    ({ errorName, errorMessage }) => {
      (window as any).__speechMock.failNextStart(errorName, errorMessage);
    },
    { errorName: name, errorMessage: message },
  );
}

export const emitSpeechError = (page: Page, error = "audio-capture") =>
  page.evaluate((value) => (window as any).__speechMock.emitError(value), error);

export const emitSpeechEnd = (page: Page) => page.evaluate(() => (window as any).__speechMock.emitEnd());

export const getSpeechStartCount = (page: Page): Promise<number> =>
  page.evaluate(() => (window as any).__speechMock.startCount);

export async function startSession(page: Page) {
  await page.getByText("Start", { exact: true }).click();
  await page.waitForTimeout(300);
}

export async function pauseSession(page: Page) {
  await page.getByText("Pause", { exact: true }).click();
  await page.waitForTimeout(300);
}

export async function stopSession(page: Page) {
  await page.getByText("Stop", { exact: true }).click();
  await page.waitForSelector("text=Ready", { timeout: 5000 });
}

export const DETECT_WAIT_MS = 2500;

export async function mockExternalRoutes(page: Page) {
  await page.route("**/cdn.jsdelivr.net/**", async (route) => {
    const body = fs.readFileSync(
      path.join(
        __dirname,
        "../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf",
      ),
    );
    await route.fulfill({ status: 200, contentType: "font/ttf", body });
  });
  await page.route("**open5e**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
    });
  });
}

export async function setupTest(page: Page) {
  await injectSpeechMock(page);
  await mockExternalRoutes(page);
  await page.goto("/");
  await waitForApp(page);
}

export const setupTestWithSession = (page: Page) => setupTest(page).then(() => startSession(page));
