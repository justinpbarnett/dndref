import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());
const platform = vi.hoisted(() => ({ OS: 'web' }));
const sttMocks = vi.hoisted(() => ({
  deepgramInstances: [] as any[],
  deepgramStartError: null as Error | null,
  webSpeechInstances: [] as any[],
  webSpeechStartError: null as Error | null,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
  },
}));
vi.mock('react-native', () => ({ Platform: platform }));
vi.mock('../stt/deepgram', () => ({
  DeepgramProvider: class {
    readonly name = 'Deepgram';

    constructor(
      readonly apiKey: string,
      readonly onTranscript: (text: string) => void,
      readonly onError: (error: string) => void,
    ) {
      sttMocks.deepgramInstances.push(this);
    }

    async start() {
      if (sttMocks.deepgramStartError) throw sttMocks.deepgramStartError;
    }

    pause() {}
    resume() {}
    stop() {}
    emitTranscript(text: string) { this.onTranscript(text); }
    emitError(error: string) { this.onError(error); }
  },
}));
vi.mock('../stt/web-speech', () => ({
  WebSpeechProvider: class {
    readonly name = 'Web Speech';

    constructor(
      readonly onTranscript: (text: string) => void,
      readonly onError: (error: string) => void,
    ) {
      sttMocks.webSpeechInstances.push(this);
    }

    async start() {
      if (sttMocks.webSpeechStartError) throw sttMocks.webSpeechStartError;
    }

    pause() {}
    resume() {}
    stop() {}
    emitTranscript(text: string) { this.onTranscript(text); }
    emitError(error: string) { this.onError(error); }
  },
}));

import { buildProvider, loadSettings } from './build-provider';
import { resetAppDataControlsForTests, saveVoiceSettings } from '../storage/app-data';

describe('STT provider settings', () => {
  beforeEach(() => {
    storage.clear();
    platform.OS = 'web';
    sttMocks.deepgramInstances.length = 0;
    sttMocks.deepgramStartError = null;
    sttMocks.webSpeechInstances.length = 0;
    sttMocks.webSpeechStartError = null;
    resetAppDataControlsForTests();
    vi.clearAllMocks();
  });

  it('uses voice settings saved through local app data for the next provider selection', async () => {
    const savedSettings = {
      provider: 'deepgram' as const,
      deepgramApiKey: 'saved-session-key',
    };

    await saveVoiceSettings(savedSettings);
    const loadedSettings = await loadSettings();
    const provider = buildProvider(loadedSettings, vi.fn(), vi.fn());

    expect(loadedSettings).toEqual(savedSettings);
    expect(provider.name).toBe('Deepgram');
  });

  it('wraps Web Speech so stopped capture events do not reach session callbacks', async () => {
    const onTranscript = vi.fn();
    const onError = vi.fn();
    const provider = buildProvider({ provider: 'web-speech', deepgramApiKey: '' }, onTranscript, onError);

    await provider.start();
    sttMocks.webSpeechInstances[0].emitTranscript('active speech');
    await provider.stop();
    sttMocks.webSpeechInstances[0].emitTranscript('late speech');
    sttMocks.webSpeechInstances[0].emitError('late error');

    expect(onTranscript).toHaveBeenCalledTimes(1);
    expect(onTranscript).toHaveBeenCalledWith('active speech');
    expect(onError).not.toHaveBeenCalled();
  });

  it('still propagates Web Speech and Deepgram startup failures', async () => {
    sttMocks.webSpeechStartError = new Error('browser mic denied');
    await expect(
      buildProvider({ provider: 'web-speech', deepgramApiKey: '' }, vi.fn(), vi.fn()).start(),
    ).rejects.toThrow('browser mic denied');

    sttMocks.deepgramStartError = new Error('deepgram rejected key');
    await expect(
      buildProvider({ provider: 'deepgram', deepgramApiKey: 'bad-key' }, vi.fn(), vi.fn()).start(),
    ).rejects.toThrow('deepgram rejected key');
  });
});
