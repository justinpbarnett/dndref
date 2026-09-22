import * as fs from "fs";
import * as path from "path";

import { Page } from "@playwright/test";

async function injectSpeechMock(page: Page) {
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

async function waitForApp(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForSelector("text=Ready", { timeout: 20000 });
}

export async function waitForSettledPage(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
}

async function gotoSettings(page: Page) {
  await page.goto("/settings");
  await page.waitForLoadState("load");
  await page.waitForSelector("text=Display", { timeout: 20000 });
}

async function speak(page: Page, text: string) {
  const ok = await page.evaluate((t) => (window as any).__speak(t), text);
  if (!ok) throw new Error(`speak() failed -- SpeechRecognition not active. text: "${text}"`);
}

async function failNextSpeechStart(
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

const emitSpeechError = (page: Page, error = "audio-capture") =>
  page.evaluate((value) => (window as any).__speechMock.emitError(value), error);

const emitSpeechEnd = (page: Page) => page.evaluate(() => (window as any).__speechMock.emitEnd());

const getSpeechStartCount = (page: Page): Promise<number> =>
  page.evaluate(() => (window as any).__speechMock.startCount);

async function startSession(page: Page) {
  await page.getByText("Start", { exact: true }).click();
  await page.waitForTimeout(300);
}

async function pauseSession(page: Page) {
  await page.getByText("Pause", { exact: true }).click();
  await page.waitForTimeout(300);
}

async function resumeSession(page: Page) {
  await page.getByText("Resume", { exact: true }).click();
  await page.waitForTimeout(300);
}

async function stopSession(page: Page) {
  await page.getByText("Stop", { exact: true }).click();
  await page.waitForSelector("text=Ready", { timeout: 5000 });
}

const DETECT_WAIT_MS = 2500;

const waitForDetectionPass = (page: Page) => page.waitForTimeout(DETECT_WAIT_MS);

async function speakAndWait(page: Page, text: string) {
  await speak(page, text);
  await waitForDetectionPass(page);
}

async function mockExternalRoutes(page: Page) {
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

/**
 * One table, driven the way a player drives it: say something, pause, stop.
 *
 * The ordering rules live here and nowhere else. Speech only lands once
 * recognition is running, a detection pass only finishes after the interval, and
 * the controls need a moment to settle. A spec that had to know all three either
 * rebuilt `say` by hand or reached past the helpers into the page.
 */
export type TableSession = {
  readonly page: Page;
  say(text: string): Promise<void>;
  sayWithoutWaiting(text: string): Promise<void>;
  waitForDetection(): Promise<void>;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  openSettings(): Promise<void>;
  failNextStart(name?: string, message?: string): Promise<void>;
  emitError(error?: string): Promise<void>;
  emitEnd(): Promise<void>;
  startCount(): Promise<number>;
};

const driveTable = (page: Page): TableSession => ({
  page,
  say: (text) => speakAndWait(page, text),
  sayWithoutWaiting: (text) => speak(page, text),
  waitForDetection: () => waitForDetectionPass(page),
  start: () => startSession(page),
  pause: () => pauseSession(page),
  resume: () => resumeSession(page),
  stop: () => stopSession(page),
  openSettings: () => gotoSettings(page),
  failNextStart: (name, message) => failNextSpeechStart(page, name, message),
  emitError: (error) => emitSpeechError(page, error),
  emitEnd: () => emitSpeechEnd(page),
  startCount: () => getSpeechStartCount(page),
});

/** A loaded app with the voice mock in place, before anyone hits Start. */
export async function openTable(page: Page): Promise<TableSession> {
  await injectSpeechMock(page);
  await mockExternalRoutes(page);
  await page.goto("/");
  await waitForApp(page);
  return driveTable(page);
}

/** The same table, already listening. */
export async function openTableSession(page: Page): Promise<TableSession> {
  const table = await openTable(page);
  await table.start();
  return table;
}
