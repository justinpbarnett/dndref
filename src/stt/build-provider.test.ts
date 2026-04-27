import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());
const platform = vi.hoisted(() => ({ OS: 'web' }));

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
    constructor(readonly apiKey: string) {}
    async start() {}
    pause() {}
    resume() {}
    stop() {}
  },
}));
vi.mock('../stt/web-speech', () => ({
  WebSpeechProvider: class {
    readonly name = 'Web Speech';
    async start() {}
    pause() {}
    resume() {}
    stop() {}
  },
}));

import { buildProvider, loadSettings } from './build-provider';
import { resetAppDataControlsForTests, saveVoiceSettings } from '../storage/app-data';

describe('STT provider settings', () => {
  beforeEach(() => {
    storage.clear();
    platform.OS = 'web';
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
});
