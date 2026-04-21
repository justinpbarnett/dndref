import { beforeEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => {
  (globalThis as any).__DEV__ = false;
  return { OS: 'ios' };
});

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

const nativeState = vi.hoisted(() => {
  class MockRecording {
    stopCalls = 0;
    uri = 'file:///chunk.m4a';

    constructor() {
      state.recordings.push(this);
    }

    async prepareToRecordAsync(): Promise<void> {
      if (!state.nextPrepare) return;
      await state.nextPrepare.promise;
    }

    async startAsync(): Promise<void> {}

    async stopAndUnloadAsync(): Promise<void> {
      this.stopCalls += 1;
    }

    getURI(): string {
      return this.uri;
    }
  }

  const state = {
    MockRecording,
    recordings: [] as MockRecording[],
    nextPrepare: null as Deferred | null,
  };
  return state;
});

vi.mock('react-native', () => ({ Platform: platform }));
vi.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: vi.fn(async () => ({ granted: true })),
    setAudioModeAsync: vi.fn(async () => undefined),
    Recording: nativeState.MockRecording,
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
  },
}));
vi.mock('expo-file-system/legacy', () => ({
  default: {},
  FileSystemUploadType: { BINARY_CONTENT: 'BINARY_CONTENT' },
  uploadAsync: vi.fn(async () => ({ status: 200, body: '{"results":{"channels":[{"alternatives":[{"transcript":""}]}]}}' })),
  deleteAsync: vi.fn(async () => undefined),
}));

import { DeepgramProvider } from './deepgram';

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => { resolve = res; });
  return { promise, resolve };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('DeepgramProvider lifecycle', () => {
  beforeEach(() => {
    platform.OS = 'ios';
    nativeState.recordings.length = 0;
    nativeState.nextPrepare = null;
    vi.clearAllMocks();
  });

  it('unloads native recording if stop happens during first chunk startup', async () => {
    nativeState.nextPrepare = deferred();
    const onError = vi.fn();
    const provider = new DeepgramProvider('key', vi.fn(), onError);

    const startPromise = provider.start();
    for (let i = 0; i < 10 && nativeState.recordings.length === 0; i++) {
      await flush();
    }
    expect(nativeState.recordings).toHaveLength(1);

    const stopPromise = provider.stop();
    nativeState.nextPrepare.resolve();
    await Promise.all([startPromise, stopPromise]);

    expect(nativeState.recordings[0].stopCalls).toBe(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('cleans up web mic stream when stopped before Deepgram websocket opens', async () => {
    platform.OS = 'web';
    const trackStop = vi.fn();
    const stream = { getTracks: () => [{ stop: trackStop }] };
    const sockets: Array<{ close: () => void; onclose: ((event: CloseEvent) => void) | null }> = [];

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { mediaDevices: { getUserMedia: vi.fn(async () => stream) } },
    });
    (globalThis as any).MediaRecorder = class {
      static isTypeSupported() { return true; }
    };
    (globalThis as any).WebSocket = class {
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 0;
      onclose: ((event: CloseEvent) => void) | null = null;

      constructor() {
        sockets.push(this);
      }

      close() {
        this.readyState = 3;
        this.onclose?.({ code: 1000 } as CloseEvent);
      }
    };

    const provider = new DeepgramProvider('key', vi.fn(), vi.fn());
    const startPromise = provider.start();
    await flush();

    await expect(provider.stop()).resolves.toBeUndefined();
    await expect(startPromise).rejects.toThrow('Deepgram connection closed');
    expect(sockets).toHaveLength(1);
    expect(trackStop).toHaveBeenCalledTimes(1);
  });

  it('cleans up web mic stream when stopped while getUserMedia is pending', async () => {
    platform.OS = 'web';
    const trackStop = vi.fn();
    const stream = { getTracks: () => [{ stop: trackStop }] };
    let resolveStream!: (value: typeof stream) => void;
    const getUserMedia = vi.fn(() => new Promise<typeof stream>((resolve) => { resolveStream = resolve; }));

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { mediaDevices: { getUserMedia } },
    });
    (globalThis as any).MediaRecorder = class {
      static isTypeSupported() { return true; }
    };
    const sockets: unknown[] = [];
    (globalThis as any).WebSocket = class {
      constructor() {
        sockets.push(this);
      }
    };

    const provider = new DeepgramProvider('key', vi.fn(), vi.fn());
    const startPromise = provider.start();
    await flush();

    await provider.stop();
    resolveStream(stream);

    await expect(startPromise).rejects.toThrow('microphone access completed');
    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(0);
  });
});
