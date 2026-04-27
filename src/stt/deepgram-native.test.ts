import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

const nativeState = vi.hoisted(() => {
  class MockRecording {
    recordCalls = 0;
    stopCalls = 0;
    uri: string;

    constructor() {
      this.uri = `file:///chunk-${state.recordings.length}.m4a`;
      state.recordings.push(this);
    }

    async prepareToRecordAsync(): Promise<void> {
      if (!state.nextPrepare) return;
      await state.nextPrepare.promise;
    }

    record(): void { this.recordCalls += 1; }

    async stop(): Promise<void> { this.stopCalls += 1; }

    release(): void {}
  }

  const state = {
    MockRecording,
    nextPrepare: null as Deferred | null,
    recordings: [] as MockRecording[],
  };
  return state;
});

const fileSystemMocks = vi.hoisted(() => ({
  deleteAsync: vi.fn(async () => undefined),
  uploadAsync: vi.fn(async () => ({
    body: '{"results":{"channels":[{"alternatives":[{"transcript":""}]}]}}',
    status: 200,
  })),
}));

vi.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: vi.fn(async () => ({ granted: true })),
  setAudioModeAsync: vi.fn(async () => undefined),
}));
vi.mock('expo-audio/build/AudioModule', () => ({
  default: { AudioRecorder: nativeState.MockRecording },
}));
vi.mock('expo-audio/build/utils/options', () => ({
  createRecordingOptions: vi.fn((options) => options),
}));
vi.mock('expo-file-system/legacy', () => ({
  default: {},
  FileSystemUploadType: { BINARY_CONTENT: 'BINARY_CONTENT' },
  deleteAsync: fileSystemMocks.deleteAsync,
  uploadAsync: fileSystemMocks.uploadAsync,
}));

import { DeepgramNativeCaptureAdapter } from './deepgram-native';

function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => { resolve = res; });
  return { promise, resolve };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function flushUntil(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 20 && !predicate(); i += 1) await flush();
}

describe('Deepgram native capture adapter', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    nativeState.nextPrepare = null;
    nativeState.recordings.length = 0;
    fileSystemMocks.deleteAsync.mockResolvedValue(undefined);
    fileSystemMocks.uploadAsync.mockResolvedValue({
      body: '{"results":{"channels":[{"alternatives":[{"transcript":""}]}]}}',
      status: 200,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('unloads native recording if stop happens during first chunk startup', async () => {
    nativeState.nextPrepare = deferred();
    const onError = vi.fn();
    const provider = new DeepgramNativeCaptureAdapter('key', vi.fn(), onError);

    const startPromise = provider.start();
    for (let i = 0; i < 10 && nativeState.recordings.length === 0; i += 1) await flush();
    expect(nativeState.recordings).toHaveLength(1);

    const stopPromise = provider.stop();
    nativeState.nextPrepare.resolve();
    await Promise.all([startPromise, stopPromise]);

    expect(nativeState.recordings[0].stopCalls).toBe(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('uploads completed native chunks, emits transcripts, and deletes chunk files', async () => {
    vi.useFakeTimers();
    fileSystemMocks.uploadAsync.mockResolvedValueOnce({
      body: '{"results":{"channels":[{"alternatives":[{"transcript":"Acererak awakens"}]}]}}',
      status: 200,
    });
    const onTranscript = vi.fn();
    const provider = new DeepgramNativeCaptureAdapter('native-key', onTranscript, vi.fn());

    await provider.start();

    try {
      expect(nativeState.recordings).toHaveLength(1);
      const firstChunk = nativeState.recordings[0];

      await vi.advanceTimersByTimeAsync(5000);
      await flushUntil(() => fileSystemMocks.deleteAsync.mock.calls.length > 0);

      expect(firstChunk.stopCalls).toBe(1);
      expect(fileSystemMocks.uploadAsync).toHaveBeenCalledWith(
        'https://api.deepgram.com/v1/listen?model=nova-2&punctuate=true&smart_format=true&language=en-US',
        firstChunk.uri,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Token native-key',
            'Content-Type': 'audio/mp4',
          }),
          httpMethod: 'POST',
        }),
      );
      expect(fileSystemMocks.deleteAsync).toHaveBeenCalledWith(firstChunk.uri, { idempotent: true });
      expect(onTranscript).toHaveBeenCalledWith('Acererak awakens');
      expect(nativeState.recordings.length).toBeGreaterThanOrEqual(2);
    } finally {
      await provider.stop();
    }
  });
});
