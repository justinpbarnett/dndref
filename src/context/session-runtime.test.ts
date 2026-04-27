import { describe, expect, it, vi } from 'vitest';

import type { Entity } from '../entities';
import type { STTProvider, STTSettings } from '../stt';
import { SessionRuntime, type SessionRuntimeDetector } from './session-runtime';

const TEST_STT_SETTINGS: STTSettings = { provider: 'web-speech', deepgramApiKey: '' };

function makeEntity(id: string, name: string): Entity {
  return {
    id,
    name,
    type: 'NPC',
    aliases: [],
    summary: `${name} summary`,
  };
}

class FakeDetector implements SessionRuntimeDetector {
  inputs: string[] = [];

  constructor(private readonly respond: (input: string) => Entity[]) {}

  detect(input: string): Entity[] {
    this.inputs.push(input);
    return this.respond(input);
  }
}

class FakeSTTProvider implements STTProvider {
  readonly name = 'Fake STT';
  pauseCalls = 0;
  resumeCalls = 0;
  startCalls = 0;
  stopCalls = 0;
  resumeError: unknown = null;
  startError: unknown = null;

  constructor(
    private readonly onTranscript: (text: string) => void,
    private readonly onError: (error: string) => void,
  ) {}

  async start(): Promise<void> {
    this.startCalls += 1;
    if (this.startError) throw this.startError;
  }

  async pause(): Promise<void> {
    this.pauseCalls += 1;
  }

  async resume(): Promise<void> {
    this.resumeCalls += 1;
    if (this.resumeError) throw this.resumeError;
  }

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

function makeRuntimeWithFakeStt(configure?: (provider: FakeSTTProvider) => void) {
  const providers: FakeSTTProvider[] = [];
  const runtime = new SessionRuntime({
    loadSttSettings: async () => TEST_STT_SETTINGS,
    buildSttProvider: (_settings, onTranscript, onError) => {
      const provider = new FakeSTTProvider(onTranscript, onError);
      configure?.(provider);
      providers.push(provider);
      return provider;
    },
    detectIntervalMs: 0,
  });
  return { providers, runtime };
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

describe('SessionRuntime', () => {
  it('carries active transcript context so split entity names are detected', () => {
    const redOakKeep = makeEntity('red-oak-keep', 'Red Oak Keep');
    const detector = new FakeDetector((input) => (
      normalizeSpaces(input).includes('Red Oak Keep') ? [redOakKeep] : []
    ));
    const runtime = new SessionRuntime();

    runtime.setDetector(detector);
    runtime.activate();
    runtime.appendTranscript('The party reached Red');
    runtime.processTranscript();
    runtime.appendTranscript('Oak Keep before sunset');
    runtime.processTranscript();

    const lastInput = detector.inputs[detector.inputs.length - 1];
    expect(normalizeSpaces(lastInput)).toContain('Red Oak Keep before sunset');
    expect(runtime.getSnapshot().cards.map((card) => card.entity.name)).toEqual(['Red Oak Keep']);
    expect(runtime.getSnapshot().recentDetections).toEqual([redOakKeep]);
  });

  it('suppresses duplicate detections without replacing recent detections or cards', () => {
    const valdrath = makeEntity('valdrath', 'Valdrath the Undying');
    const detector = new FakeDetector((input) => (
      input.includes('Valdrath') ? [valdrath] : []
    ));
    const runtime = new SessionRuntime();

    runtime.setDetector(detector);
    runtime.activate();
    runtime.appendTranscript('Valdrath spoke first');
    runtime.processTranscript();
    const firstCards = runtime.getSnapshot().cards;
    const firstRecentDetections = runtime.getSnapshot().recentDetections;

    runtime.appendTranscript('then Valdrath spoke again');
    runtime.processTranscript();

    expect(runtime.getSnapshot().cards).toBe(firstCards);
    expect(runtime.getSnapshot().cards).toHaveLength(1);
    expect(runtime.getSnapshot().recentDetections).toBe(firstRecentDetections);
  });

  it('adds detected entities to the card stack and recent detections', () => {
    const valdrath = makeEntity('valdrath', 'Valdrath the Undying');
    const malachar = makeEntity('malachar', 'Malachar the Grey');
    const detector = new FakeDetector(() => [valdrath, malachar]);
    const runtime = new SessionRuntime();

    runtime.setDetector(detector);
    runtime.activate();
    runtime.appendTranscript('Valdrath summoned Malachar to the fortress');
    runtime.processTranscript();

    expect(runtime.getSnapshot().cards.map((card) => card.entity.id).sort()).toEqual(['malachar', 'valdrath']);
    expect(runtime.getSnapshot().cards).toHaveLength(2);
    expect(runtime.getSnapshot().cards.every((card) => !card.pinned)).toBe(true);
    expect(runtime.getSnapshot().recentDetections).toEqual([valdrath, malachar]);
  });

  it('runs detection from its own active interval and clears the interval when paused', () => {
    vi.useFakeTimers();
    let runtime: SessionRuntime | null = null;
    try {
      const valdrath = makeEntity('valdrath', 'Valdrath the Undying');
      const seraphine = makeEntity('seraphine', 'Lady Seraphine Voss');
      const detector = new FakeDetector((input) => [
        ...(input.includes('Valdrath') ? [valdrath] : []),
        ...(input.includes('Seraphine') ? [seraphine] : []),
      ]);
      runtime = new SessionRuntime({ detectIntervalMs: 100 });
      runtime.setDetector(detector);

      runtime.activate();
      runtime.appendTranscript('Valdrath watches from the throne');
      vi.advanceTimersByTime(100);
      expect(runtime.getSnapshot().cards.map((card) => card.entity.id)).toEqual(['valdrath']);

      runtime.pause();
      runtime.appendTranscript('Seraphine entered while paused');
      vi.advanceTimersByTime(300);
      expect(runtime.getSnapshot().cards.map((card) => card.entity.id)).toEqual(['valdrath']);
    } finally {
      runtime?.dispose();
      vi.useRealTimers();
    }
  });

  it('starts, pauses, resumes, gates speech, and stops through the runtime', async () => {
    const valdrath = makeEntity('valdrath', 'Valdrath the Undying');
    const detector = new FakeDetector((input) => (input.includes('Valdrath') ? [valdrath] : []));
    const { providers, runtime } = makeRuntimeWithFakeStt();
    runtime.setDetector(detector);

    await runtime.start();
    const provider = providers[0];
    expect(runtime.getSnapshot()).toMatchObject({
      status: 'active',
      sttStatus: 'active',
      sttError: null,
      sttProviderName: 'Fake STT',
    });

    provider.emitTranscript('Valdrath spoke first');
    runtime.processTranscript();
    expect(runtime.getSnapshot().cards.map((card) => card.entity.id)).toEqual(['valdrath']);

    runtime.pause();
    expect(provider.pauseCalls).toBe(1);
    provider.emitTranscript('Malachar was only heard while paused');
    expect(runtime.getSnapshot().transcript).toBe('Valdrath spoke first');

    await runtime.resume();
    expect(providers).toHaveLength(1);
    expect(provider.resumeCalls).toBe(1);
    provider.emitTranscript('Seraphine spoke after resume');
    expect(runtime.getSnapshot().transcript).toBe('Valdrath spoke first Seraphine spoke after resume');

    runtime.stop();
    expect(provider.stopCalls).toBe(1);
    expect(runtime.getSnapshot()).toMatchObject({
      status: 'idle',
      sttStatus: 'idle',
      sttError: null,
      sttProviderName: '',
      cards: [],
      recentDetections: [],
      transcript: '',
    });
    provider.emitTranscript('late speech');
    provider.emitError('late error');
    expect(runtime.getSnapshot()).toMatchObject({ sttError: null, transcript: '' });
  });

  it('reports start failures, clears provider state, and can retry', async () => {
    let failNextStart = true;
    const { providers, runtime } = makeRuntimeWithFakeStt((provider) => {
      if (failNextStart) {
        provider.startError = new Error('permission denied');
        failNextStart = false;
      }
    });

    await runtime.start();
    expect(providers[0].startCalls).toBe(1);
    expect(providers[0].stopCalls).toBe(1);
    expect(runtime.getSnapshot()).toMatchObject({
      status: 'idle',
      sttStatus: 'error',
      sttError: 'Failed to start mic: permission denied',
      sttProviderName: '',
    });

    await runtime.start();
    expect(providers).toHaveLength(2);
    expect(providers[1].startCalls).toBe(1);
    expect(runtime.getSnapshot()).toMatchObject({ status: 'active', sttStatus: 'active', sttError: null });
  });

  it('reports resume failures, ignores stale speech, and creates a fresh provider on retry', async () => {
    const { providers, runtime } = makeRuntimeWithFakeStt();
    await runtime.start();
    const provider = providers[0];
    runtime.pause();
    provider.resumeError = new Error('device lost');

    await runtime.resume();
    expect(provider.resumeCalls).toBe(1);
    expect(provider.stopCalls).toBe(1);
    expect(runtime.getSnapshot()).toMatchObject({
      status: 'paused',
      sttStatus: 'error',
      sttError: 'Failed to resume mic: device lost',
    });

    provider.emitTranscript('stale speech after resume failure');
    expect(runtime.getSnapshot().transcript).toBe('');

    await runtime.start();
    expect(providers).toHaveLength(2);
    expect(runtime.getSnapshot()).toMatchObject({ status: 'active', sttStatus: 'active', sttError: null });
  });

  it('handles provider error callbacks by pausing and allowing a fresh start', async () => {
    const { providers, runtime } = makeRuntimeWithFakeStt();
    await runtime.start();
    const provider = providers[0];

    provider.emitError('Mic error: audio-capture');

    expect(provider.stopCalls).toBe(1);
    expect(runtime.getSnapshot()).toMatchObject({
      status: 'paused',
      sttStatus: 'error',
      sttError: 'Mic error: audio-capture',
    });
    provider.emitTranscript('speech after fatal error');
    expect(runtime.getSnapshot().transcript).toBe('');

    await runtime.start();
    expect(providers).toHaveLength(2);
    expect(runtime.getSnapshot()).toMatchObject({ status: 'active', sttStatus: 'active', sttError: null });
  });
});
