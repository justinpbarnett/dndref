import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());
const platform = vi.hoisted(() => ({ OS: "web" }));

type MockProviderInstance = { emitError(error: string): void; emitTranscript(text: string): void };

const sttMocks = vi.hoisted(() => {
  const state = {
    deepgramInstances: [] as MockProviderInstance[],
    deepgramStartError: null as Error | null,
    webSpeechInstances: [] as MockProviderInstance[],
    webSpeechStartError: null as Error | null,
  };
  const createProvider = (
    name: string,
    instances: MockProviderInstance[],
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

      async start(): Promise<void> {
        if (state[errorKey]) throw state[errorKey];
      }
      pause(): void {}
      resume(): void {}
      stop(): void {}
      emitTranscript = (text: string) => this.onTranscript(text);
      emitError = (error: string) => this.onError(error);
    };
  return Object.assign(state, {
    DeepgramProvider: createProvider("Deepgram", state.deepgramInstances, "deepgramStartError"),
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
vi.mock("./deepgram", () => ({ DeepgramProvider: sttMocks.DeepgramProvider }));
vi.mock("./web-speech", () => ({ WebSpeechProvider: sttMocks.WebSpeechProvider }));

import { buildProvider, loadSettings } from "./build-provider";
import { resetAppDataControlsForTests, saveVoiceSettings } from "../storage/app-data";

describe("STT provider settings", () => {
  beforeEach(() => {
    storage.clear();
    platform.OS = "web";
    sttMocks.deepgramInstances.length = 0;
    sttMocks.deepgramStartError = null;
    sttMocks.webSpeechInstances.length = 0;
    sttMocks.webSpeechStartError = null;
    resetAppDataControlsForTests();
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

  it("wraps Web Speech so stopped capture events do not reach session callbacks", async () => {
    const onTranscript = vi.fn();
    const onError = vi.fn();
    const provider = buildProvider({ provider: "web-speech", deepgramApiKey: "" }, onTranscript, onError);

    await provider.start();
    sttMocks.webSpeechInstances[0].emitTranscript("active speech");
    await provider.stop();
    sttMocks.webSpeechInstances[0].emitTranscript("late speech");
    sttMocks.webSpeechInstances[0].emitError("late error");

    expect(onTranscript).toHaveBeenCalledTimes(1);
    expect(onTranscript).toHaveBeenCalledWith("active speech");
    expect(onError).not.toHaveBeenCalled();
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
