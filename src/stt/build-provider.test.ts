import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());
const platform = vi.hoisted(() => ({ OS: "web" }));

const sttMocks = vi.hoisted(() => {
  const state = {
    browserInstances: [] as unknown[],
    nativeInstances: [] as unknown[],
    deepgramStartError: null as Error | null,
    webSpeechInstances: [] as unknown[],
    webSpeechStartError: null as Error | null,
  };
  const createProvider = (
    name: string,
    instances: unknown[],
    errorKey: "deepgramStartError" | "webSpeechStartError",
  ) =>
    class {
      readonly name = name;
      private readonly onTranscript: (text: string) => void;
      private readonly onError: (error: string) => void;

      constructor(...args: unknown[]) {
        this.onTranscript = args.at(-2) as (text: string) => void;
        this.onError = args.at(-1) as (error: string) => void;
        instances.push(this);
      }

      start = () => (state[errorKey] ? Promise.reject(state[errorKey]) : Promise.resolve());
      pause(): void {}
      resume(): void {}
      stop(): void {}
      emitTranscript = (text: string) => this.onTranscript(text);
      emitError = (error: string) => this.onError(error);
    };
  return Object.assign(state, {
    DeepgramBrowserCaptureAdapter: createProvider("Deepgram", state.browserInstances, "deepgramStartError"),
    DeepgramNativeCaptureAdapter: createProvider("Deepgram", state.nativeInstances, "deepgramStartError"),
    WebSpeechProvider: createProvider("Web Speech", state.webSpeechInstances, "webSpeechStartError"),
  });
});

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => storage.set(key, value)),
  },
}));
vi.mock("react-native", () => ({ Platform: platform }));
vi.mock("./deepgram-browser", () => ({ DeepgramBrowserCaptureAdapter: sttMocks.DeepgramBrowserCaptureAdapter }));
vi.mock("./deepgram-native", () => ({ DeepgramNativeCaptureAdapter: sttMocks.DeepgramNativeCaptureAdapter }));
vi.mock("./web-speech", () => ({ WebSpeechProvider: sttMocks.WebSpeechProvider }));

import { buildProvider, loadSettings } from "./build-provider";
import { resetAppDataForTests } from "../storage/app-data";
import { saveVoiceSettings } from "../storage/settings";

describe("STT provider settings", () => {
  beforeEach(() => {
    storage.clear();
    platform.OS = "web";
    sttMocks.browserInstances.length = 0;
    sttMocks.nativeInstances.length = 0;
    sttMocks.deepgramStartError = null;
    sttMocks.webSpeechInstances.length = 0;
    sttMocks.webSpeechStartError = null;
    resetAppDataForTests();
    vi.clearAllMocks();
  });

  it("uses voice settings saved through local app data for the next provider selection", async () => {
    const savedSettings = {
      provider: "deepgram" as const,
      deepgramApiKey: "saved-session-key",
    };

    await saveVoiceSettings(savedSettings);
    const loadedSettings = await loadSettings();
    const provider = buildProvider(loadedSettings, vi.fn(), vi.fn());

    expect(loadedSettings).toEqual(savedSettings);
    expect(provider.name).toBe("Deepgram");
  });

  it("captures through the browser adapter when the web build uses Deepgram", () => {
    buildProvider({ provider: "deepgram", deepgramApiKey: "browser-key" }, vi.fn(), vi.fn());

    expect(sttMocks.browserInstances).toHaveLength(1);
    expect(sttMocks.nativeInstances).toHaveLength(0);
  });

  it("captures through the native adapter off web", () => {
    platform.OS = "ios";

    buildProvider({ provider: "deepgram", deepgramApiKey: "native-key" }, vi.fn(), vi.fn());

    expect(sttMocks.nativeInstances).toHaveLength(1);
    expect(sttMocks.browserInstances).toHaveLength(0);
  });

  it("falls back to Web Speech on web when no Deepgram key is configured", () => {
    const provider = buildProvider({ provider: "deepgram", deepgramApiKey: "" }, vi.fn(), vi.fn());

    expect(provider.name).toBe("Web Speech");
  });

  it("uses Deepgram on native even when settings name Web Speech", () => {
    platform.OS = "ios";

    const provider = buildProvider({ provider: "web-speech", deepgramApiKey: "native-key" }, vi.fn(), vi.fn());

    expect(provider.name).toBe("Deepgram");
  });

  it("still propagates Web Speech and Deepgram startup failures", async () => {
    sttMocks.webSpeechStartError = new Error("browser mic denied");
    await expect(
      buildProvider({ provider: "web-speech", deepgramApiKey: "" }, vi.fn(), vi.fn()).start(),
    ).rejects.toThrow("browser mic denied");

    sttMocks.deepgramStartError = new Error("deepgram rejected key");
    await expect(
      buildProvider({ provider: "deepgram", deepgramApiKey: "bad-key" }, vi.fn(), vi.fn()).start(),
    ).rejects.toThrow("deepgram rejected key");
  });
});
