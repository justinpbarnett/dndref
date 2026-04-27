import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { DEFAULT_STT_SETTINGS, type STTSettings } from '../stt';
import {
  VOICE_SAVED_INDICATOR_MS,
  createVoiceSettingsCategoryController,
  type VoiceSettingsCategoryController,
  type VoiceSettingsCategoryControllerOptions,
} from './voice-settings-category';

const controllers: VoiceSettingsCategoryController[] = [];

function createController(options: VoiceSettingsCategoryControllerOptions) {
  const controller = createVoiceSettingsCategoryController(options);
  controllers.push(controller);
  return controller;
}

describe('voice settings category controller', () => {
  afterEach(() => {
    controllers.splice(0).forEach((controller) => controller.dispose());
    vi.useRealTimers();
  });

  it('loads saved voice settings and saves the current category draft', async () => {
    const savedSettings: STTSettings = {
      provider: 'deepgram',
      deepgramApiKey: 'saved-deepgram-key',
    };
    const loadVoiceSettings = vi.fn(async () => savedSettings);
    const saveVoiceSettings = vi.fn(async () => true);
    const controller = createController({ loadVoiceSettings, saveVoiceSettings });

    await controller.load();
    expect(controller.getSnapshot().sttSettings).toEqual(savedSettings);

    controller.setSttSettings((current) => ({
      ...current,
      provider: 'web-speech',
    }));
    await controller.save();

    expect(saveVoiceSettings).toHaveBeenCalledWith({
      provider: 'web-speech',
      deepgramApiKey: 'saved-deepgram-key',
    });
    expect(controller.getSnapshot().voiceSaved).toBe(true);
  });

  it('keeps newer draft changes when an earlier save finishes', async () => {
    let finishSave: (saved: boolean) => void = () => {};
    const saveVoiceSettings = vi.fn(() => new Promise<boolean>((resolve) => {
      finishSave = resolve;
    }));
    const controller = createController({
      loadVoiceSettings: vi.fn(async () => DEFAULT_STT_SETTINGS),
      saveVoiceSettings,
    });

    controller.setSttSettings({
      provider: 'deepgram',
      deepgramApiKey: 'saved-key',
    });
    const save = controller.save();
    controller.setSttSettings((current) => ({
      ...current,
      deepgramApiKey: 'newer-draft-key',
    }));

    finishSave(true);
    await save;

    expect(saveVoiceSettings).toHaveBeenCalledWith({
      provider: 'deepgram',
      deepgramApiKey: 'saved-key',
    });
    expect(controller.getSnapshot().sttSettings).toEqual({
      provider: 'deepgram',
      deepgramApiKey: 'newer-draft-key',
    });
    expect(controller.getSnapshot().voiceSaved).toBe(true);
  });

  it('hides the saved indicator after the confirmation timeout', async () => {
    vi.useFakeTimers();
    const controller = createController({
      loadVoiceSettings: vi.fn(async () => DEFAULT_STT_SETTINGS),
      saveVoiceSettings: vi.fn(async () => true),
    });

    await controller.save();
    expect(controller.getSnapshot().voiceSaved).toBe(true);

    vi.advanceTimersByTime(VOICE_SAVED_INDICATOR_MS - 1);
    expect(controller.getSnapshot().voiceSaved).toBe(true);

    vi.advanceTimersByTime(1);
    expect(controller.getSnapshot().voiceSaved).toBe(false);
  });
});
