import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeepgramBrowserCaptureAdapter } from './deepgram-browser';

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const originalMediaRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder');
const originalWebSocket = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');

type MockTrack = { stop: () => void };
type MockStream = { getTracks: () => MockTrack[] };

type BrowserCaptureMocks = {
  getUserMedia: ReturnType<typeof vi.fn>;
  recorders: MockMediaRecorder[];
  sockets: MockWebSocket[];
  stream: MockStream;
  trackStop: ReturnType<typeof vi.fn>;
};

class MockMediaRecorder {
  static isTypeSupported(): boolean { return true; }

  ondataavailable: ((event: { data: { size: number } }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  startMs: number | null = null;
  state = 'inactive';
  stopCalls = 0;

  constructor(
    readonly stream: MockStream,
    readonly options?: unknown,
  ) {
    installedBrowserMocks?.recorders.push(this);
  }

  start(ms: number): void {
    this.state = 'recording';
    this.startMs = ms;
  }

  pause(): void { this.state = 'paused'; }
  resume(): void { this.state = 'recording'; }

  stop(): void {
    this.stopCalls += 1;
    this.state = 'inactive';
  }

  emitChunk(data: { size: number }): void {
    this.ondataavailable?.({ data });
  }
}

class MockWebSocket {
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  closeCalls = 0;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onopen: (() => void) | null = null;
  readyState = 0;
  sent: unknown[] = [];

  constructor(
    readonly url: string,
    readonly protocols: string[],
  ) {
    installedBrowserMocks?.sockets.push(this);
  }

  close(): void {
    this.closeCalls += 1;
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: 1000 } as CloseEvent);
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  send(data: unknown): void {
    this.sent.push(data);
  }

  receive(data: string): void {
    this.onmessage?.({ data });
  }
}

let installedBrowserMocks: BrowserCaptureMocks | null = null;

function flush(): Promise<void> {
  return Promise.resolve().then(() => undefined);
}

function restoreGlobalProperty(key: string, descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) Object.defineProperty(globalThis, key, descriptor);
  else Reflect.deleteProperty(globalThis, key);
}

function installBrowserCapture(getUserMedia?: ReturnType<typeof vi.fn>): BrowserCaptureMocks {
  const recorders: MockMediaRecorder[] = [];
  const sockets: MockWebSocket[] = [];
  const trackStop = vi.fn();
  const stream: MockStream = { getTracks: () => [{ stop: trackStop }] };
  const mediaGetter = getUserMedia ?? vi.fn(async () => stream);
  const mocks = { getUserMedia: mediaGetter, recorders, sockets, stream, trackStop };

  installedBrowserMocks = mocks;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: mediaGetter } },
  });
  (globalThis as any).MediaRecorder = MockMediaRecorder;
  (globalThis as any).WebSocket = MockWebSocket;
  return mocks;
}

afterEach(() => {
  installedBrowserMocks = null;
  restoreGlobalProperty('navigator', originalNavigator);
  restoreGlobalProperty('MediaRecorder', originalMediaRecorder);
  restoreGlobalProperty('WebSocket', originalWebSocket);
  vi.clearAllMocks();
});

describe('Deepgram browser capture adapter', () => {
  it('streams browser microphone chunks over Deepgram websocket and cleans up resources', async () => {
    const { recorders, sockets, trackStop } = installBrowserCapture();
    const onTranscript = vi.fn();
    const provider = new DeepgramBrowserCaptureAdapter('browser-key', onTranscript, vi.fn());

    const startPromise = provider.start();
    await flush();
    expect(sockets).toHaveLength(1);
    expect(sockets[0].url).toContain('wss://api.deepgram.com/v1/listen?model=nova-2');
    expect(sockets[0].protocols).toEqual(['token', 'browser-key']);

    sockets[0].open();
    await startPromise;

    expect(recorders).toHaveLength(1);
    expect(recorders[0].startMs).toBe(250);

    const chunk = { size: 42 };
    recorders[0].emitChunk(chunk);
    sockets[0].receive(JSON.stringify({
      type: 'Results',
      is_final: true,
      channel: { alternatives: [{ transcript: 'Strahd arrives' }] },
    }));

    expect(sockets[0].sent).toEqual([chunk]);
    expect(onTranscript).toHaveBeenCalledWith('Strahd arrives');

    await provider.stop();

    expect(recorders[0].stopCalls).toBe(1);
    expect(sockets[0].closeCalls).toBe(1);
    expect(trackStop).toHaveBeenCalledTimes(1);
  });

  it('cleans up web mic stream when stopped before Deepgram websocket opens', async () => {
    const { sockets, trackStop } = installBrowserCapture();
    const provider = new DeepgramBrowserCaptureAdapter('key', vi.fn(), vi.fn());

    const startPromise = provider.start();
    await flush();

    const rejectedStart = expect(startPromise).rejects.toThrow('Deepgram connection closed');
    provider.stop();
    await rejectedStart;
    expect(sockets).toHaveLength(1);
    expect(sockets[0].closeCalls).toBe(1);
    expect(trackStop).toHaveBeenCalledTimes(1);
  });

  it('cleans up web mic stream when stopped while getUserMedia is pending', async () => {
    const trackStop = vi.fn();
    const stream: MockStream = { getTracks: () => [{ stop: trackStop }] };
    let resolveStream!: (value: MockStream) => void;
    const getUserMedia = vi.fn(() => new Promise<MockStream>((resolve) => { resolveStream = resolve; }));
    const { sockets } = installBrowserCapture(getUserMedia);
    const provider = new DeepgramBrowserCaptureAdapter('key', vi.fn(), vi.fn());

    const startPromise = provider.start();
    await flush();

    await provider.stop();
    resolveStream(stream);

    await expect(startPromise).rejects.toThrow('microphone access completed');
    expect(trackStop).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(0);
  });
});
