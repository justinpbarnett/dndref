import { beforeEach, describe, expect, it, vi } from "vitest";

const platform = vi.hoisted(() => ({ OS: "web" }));

const adapterState = vi.hoisted(() => {
  type MockAdapter = { apiKey: string } & Record<"startCalls" | "pauseCalls" | "resumeCalls" | "stopCalls", number>;
  const createMockAdapter = (instances: MockAdapter[]) =>
    class implements MockAdapter {
      pauseCalls = 0;
      resumeCalls = 0;
      startCalls = 0;
      stopCalls = 0;

      constructor(readonly apiKey: string) {
        instances.push(this);
      }

      start = async () => void (this.startCalls += 1);
      pause = async () => void (this.pauseCalls += 1);
      resume = async () => void (this.resumeCalls += 1);
      stop = async () => void (this.stopCalls += 1);
    };
  const browserInstances: MockAdapter[] = [];
  const nativeInstances: MockAdapter[] = [];
  return {
    MockBrowserAdapter: createMockAdapter(browserInstances),
    MockNativeAdapter: createMockAdapter(nativeInstances),
    browserInstances,
    nativeInstances,
  };
});

vi.mock("react-native", () => ({ Platform: platform }));
vi.mock("./deepgram-browser", () => ({
  DeepgramBrowserCaptureAdapter: adapterState.MockBrowserAdapter,
}));
vi.mock("./deepgram-native", () => ({
  DeepgramNativeCaptureAdapter: adapterState.MockNativeAdapter,
}));

import { DeepgramProvider } from "./deepgram";

describe("DeepgramProvider internal adapter selection", () => {
  beforeEach(() => {
    platform.OS = "web";
    adapterState.browserInstances.length = 0;
    adapterState.nativeInstances.length = 0;
  });

  it("keeps browser capture hidden behind the Deepgram provider seam on web", async () => {
    const provider = new DeepgramProvider("browser-key", vi.fn(), vi.fn());

    await provider.start();
    await provider.pause();
    await provider.resume();
    await provider.stop();

    expect(provider.name).toBe("Deepgram");
    expect(adapterState.browserInstances).toMatchObject([
      { apiKey: "browser-key", startCalls: 1, pauseCalls: 1, resumeCalls: 1, stopCalls: 1 },
    ]);
    expect(adapterState.nativeInstances).toHaveLength(0);
  });

  it("keeps native capture hidden behind the Deepgram provider seam off web", async () => {
    platform.OS = "ios";
    const provider = new DeepgramProvider("native-key", vi.fn(), vi.fn());

    await provider.start();

    expect(provider.name).toBe("Deepgram");
    expect(adapterState.browserInstances).toHaveLength(0);
    expect(adapterState.nativeInstances).toMatchObject([{ apiKey: "native-key", startCalls: 1 }]);
  });

  it("preserves the missing API key startup error before starting an adapter", async () => {
    const provider = new DeepgramProvider("", vi.fn(), vi.fn());

    await expect(provider.start()).rejects.toThrow("Deepgram API key not set");
    expect(adapterState.browserInstances).toMatchObject([{ startCalls: 0 }]);
  });
});
