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

/**
 * Move between tabs the way a player does, without reloading the page.
 *
 * `page.goto` would work and would also throw away the session, which lives in
 * React state. A spec that switches game mid-session needs the session still
 * running on the other side of the trip.
 */
async function openTab(page: Page, tab: "index" | "settings") {
  await page.getByTestId(`tab-${tab}`).click();
  await page.waitForTimeout(300);
}

async function openSources(page: Page) {
  await openTab(page, "settings");
  await page.getByText("Sources", { exact: true }).click();
  await page.getByTestId("ruleset-hint").waitFor({ timeout: 20000 });
}

/**
 * Switch the game, from the one screen that switches it.
 *
 * Picking only edits the draft, so Save is what applies it, and the world
 * reloads behind the save. Waiting for the confirmation first means the wait for
 * the world cannot read the outgoing one and call it finished. The table is left
 * back on the reference screen, which is where it was.
 */
async function switchRuleset(page: Page, ruleset: "dnd" | "mtg") {
  await openSources(page);
  await page.getByTestId(`ruleset-${ruleset}`).click();
  await page.getByText("Save", { exact: true }).click();
  await page.getByText("Saved", { exact: true }).waitFor({ timeout: 10000 });
  await page.waitForFunction(() => !document.body.innerText.includes("Loading world"), undefined, { timeout: 20000 });
  await openTab(page, "index");
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
  await mockScryfall(page);
}

/**
 * A card index small enough to reason about.
 *
 * The real catalog is 35k names, which no spec wants to assert against. The
 * shape is what matters: the catalog spells a two-faced card with a `//`, and
 * `/cards/collection` answers to a face name but never to that combined
 * spelling -- the same rule the live API enforces.
 */
const MTG_CARDS = [
  { name: "Lightning Bolt", type_line: "Instant", mana_cost: "{R}", oracle_text: "Deals 3 damage to any target." },
  {
    name: "Delver of Secrets // Insectile Aberration",
    type_line: "Creature — Human Wizard",
    card_faces: [
      { name: "Delver of Secrets", mana_cost: "{U}", oracle_text: "Look at the top card of your library." },
      { name: "Insectile Aberration", oracle_text: "Flying." },
    ],
  },
];

const cardFaceNames = (card: (typeof MTG_CARDS)[number]): string[] =>
  (card.card_faces ?? [{ name: card.name }]).map((face) => face.name);

async function mockScryfall(page: Page) {
  await page.route("**api.scryfall.com/catalog/card-names**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ object: "catalog", data: MTG_CARDS.map((card) => card.name) }),
    });
  });

  await page.route("**api.scryfall.com/cards/collection**", async (route) => {
    const { identifiers = [] } = JSON.parse(route.request().postData() ?? "{}");
    const asked = new Set(identifiers.map((identifier: { name: string }) => identifier.name));
    const data = MTG_CARDS.filter((card) => cardFaceNames(card).some((name) => asked.has(name)));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data }) });
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
  openSources(): Promise<void>;
  switchTo(ruleset: "dnd" | "mtg"): Promise<void>;
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
  openSources: () => openSources(page),
  switchTo: (ruleset) => switchRuleset(page, ruleset),
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
