import { beforeEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => ({ OS: 'web' }));

const adapterState = vi.hoisted(() => {
  class MockBrowserAdapter {
    pauseCalls = 0;
    resumeCalls = 0;
    startCalls = 0;
    stopCalls = 0;

    constructor(
      readonly apiKey: string,
      readonly onTranscript: (text: string) => void,
      readonly onError: (error: string) => void,
    ) {
      state.browserInstances.push(this);
    }

    async start(): Promise<void> { this.startCalls += 1; }
    async pause(): Promise<void> { this.pauseCalls += 1; }
    async resume(): Promise<void> { this.resumeCalls += 1; }
    async stop(): Promise<void> { this.stopCalls += 1; }
  }

  class MockNativeAdapter {
    pauseCalls = 0;
    resumeCalls = 0;
    startCalls = 0;
    stopCalls = 0;

    constructor(
      readonly apiKey: string,
      readonly onTranscript: (text: string) => void,
      readonly onError: (error: string) => void,
    ) {
      state.nativeInstances.push(this);
    }

    async start(): Promise<void> { this.startCalls += 1; }
    async pause(): Promise<void> { this.pauseCalls += 1; }
    async resume(): Promise<void> { this.resumeCalls += 1; }
    async stop(): Promise<void> { this.stopCalls += 1; }
  }

  const state = {
    MockBrowserAdapter,
    MockNativeAdapter,
    browserInstances: [] as MockBrowserAdapter[],
    nativeInstances: [] as MockNativeAdapter[],
  };
  return state;
});

vi.mock('react-native', () => ({ Platform: platform }));
vi.mock('./deepgram-browser', () => ({
  DeepgramBrowserCaptureAdapter: adapterState.MockBrowserAdapter,
}));
vi.mock('./deepgram-native', () => ({
  DeepgramNativeCaptureAdapter: adapterState.MockNativeAdapter,
}));

import { DeepgramProvider } from './deepgram';

describe('DeepgramProvider internal adapter selection', () => {
  beforeEach(() => {
    platform.OS = 'web';
    adapterState.browserInstances.length = 0;
    adapterState.nativeInstances.length = 0;
  });

  it('keeps browser capture hidden behind the Deepgram provider seam on web', async () => {
    const provider = new DeepgramProvider('browser-key', vi.fn(), vi.fn());

    await provider.start();
    await provider.pause();
    await provider.resume();
    await provider.stop();

    expect(provider.name).toBe('Deepgram');
    expect(adapterState.browserInstances).toHaveLength(1);
    expect(adapterState.nativeInstances).toHaveLength(0);
    expect(adapterState.browserInstances[0].apiKey).toBe('browser-key');
    expect(adapterState.browserInstances[0].startCalls).toBe(1);
    expect(adapterState.browserInstances[0].pauseCalls).toBe(1);
    expect(adapterState.browserInstances[0].resumeCalls).toBe(1);
    expect(adapterState.browserInstances[0].stopCalls).toBe(1);
  });

  it('keeps native capture hidden behind the Deepgram provider seam off web', async () => {
    platform.OS = 'ios';
    const provider = new DeepgramProvider('native-key', vi.fn(), vi.fn());

    await provider.start();

    expect(provider.name).toBe('Deepgram');
    expect(adapterState.browserInstances).toHaveLength(0);
    expect(adapterState.nativeInstances).toHaveLength(1);
    expect(adapterState.nativeInstances[0].apiKey).toBe('native-key');
    expect(adapterState.nativeInstances[0].startCalls).toBe(1);
  });

  it('preserves the missing API key startup error before starting an adapter', async () => {
    const provider = new DeepgramProvider('', vi.fn(), vi.fn());

    await expect(provider.start()).rejects.toThrow('Deepgram API key not set');
    expect(adapterState.browserInstances).toHaveLength(1);
    expect(adapterState.browserInstances[0].startCalls).toBe(0);
  });
});
