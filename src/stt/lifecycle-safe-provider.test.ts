import { describe, expect, it, vi } from 'vitest';

import { createLateEventSafeSTTProvider } from './lifecycle-safe-provider';

import type { STTProvider } from './index';

type Deferred = {
  promise: Promise<void>;
  reject: (error: unknown) => void;
  resolve: () => void;
};

function deferred(): Deferred {
  let reject!: (error: unknown) => void;
  let resolve!: () => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
}

class FakeCaptureAdapter implements STTProvider {
  readonly name = 'Fake Capture';
  startCalls = 0;
  stopCalls = 0;
  startResult: Promise<void> | null = null;
  startError: unknown = null;

  constructor(
    private readonly onTranscript: (text: string) => void,
    private readonly onError: (error: string) => void,
  ) {}

  async start(): Promise<void> {
    this.startCalls += 1;
    if (this.startError) throw this.startError;
    if (this.startResult) await this.startResult;
  }

  pause(): void {}
  resume(): void {}

  async stop(): Promise<void> {
    this.stopCalls += 1;
  }

  emitTranscript(text: string): void {
    this.onTranscript(text);
  }

  emitError(error: string): void {
    this.onError(error);
  }
}

function makeProvider(configure?: (adapter: FakeCaptureAdapter) => void) {
  const adapters: FakeCaptureAdapter[] = [];
  const onTranscript = vi.fn();
  const onError = vi.fn();
  const provider = createLateEventSafeSTTProvider((safeTranscript, safeError) => {
    const adapter = new FakeCaptureAdapter(safeTranscript, safeError);
    configure?.(adapter);
    adapters.push(adapter);
    return adapter;
  }, onTranscript, onError);

  return { adapters, onError, onTranscript, provider };
}

describe('late-event-safe STT provider', () => {
  it('drops transcript and error events from a stopped capture generation', async () => {
    const { adapters, onError, onTranscript, provider } = makeProvider();

    await provider.start();
    adapters[0].emitTranscript('heard while active');
    await provider.stop();
    adapters[0].emitTranscript('late after stop');
    adapters[0].emitError('late error after stop');

    expect(onTranscript).toHaveBeenCalledTimes(1);
    expect(onTranscript).toHaveBeenCalledWith('heard while active');
    expect(onError).not.toHaveBeenCalled();
  });

  it('cancels stop-during-start so startup completions cannot deliver stale events', async () => {
    const startup = deferred();
    const { adapters, onError, onTranscript, provider } = makeProvider((adapter) => {
      adapter.startResult = startup.promise;
    });

    const start = provider.start();
    adapters[0].emitTranscript('too early');
    const stop = provider.stop();
    startup.reject(new Error('mic failed after stop'));
    adapters[0].emitError('late startup error');

    await expect(start).resolves.toBeUndefined();
    await expect(stop).resolves.toBeUndefined();
    expect(adapters[0].stopCalls).toBe(1);
    expect(onTranscript).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('suppresses paused events and resumes with only the current generation enabled', async () => {
    const { adapters, onError, onTranscript, provider } = makeProvider();

    await provider.start();
    const pausedAdapter = adapters[0];
    await provider.pause();
    pausedAdapter.emitTranscript('heard while paused');
    pausedAdapter.emitError('paused error');

    await provider.resume();
    expect(adapters).toHaveLength(2);
    pausedAdapter.emitTranscript('old generation after resume');
    pausedAdapter.emitError('old error after resume');
    adapters[1].emitTranscript('current generation');
    adapters[1].emitError('current error');

    expect(pausedAdapter.stopCalls).toBe(1);
    expect(onTranscript).toHaveBeenCalledTimes(1);
    expect(onTranscript).toHaveBeenCalledWith('current generation');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith('current error');
  });

  it('propagates current startup failures so callers can show user-facing errors', async () => {
    const { onError, provider } = makeProvider((adapter) => {
      adapter.startError = new Error('permission denied');
    });

    await expect(provider.start()).rejects.toThrow('permission denied');
    expect(onError).not.toHaveBeenCalled();
  });
});
