import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Platform } from 'react-native';

import {
  createDefaultVoiceSettings,
  loadVoiceSettings as loadStoredVoiceSettings,
  mergeVoiceSettings,
  saveVoiceSettings as saveStoredVoiceSettings,
} from '../storage/app-data';
import type { STTSettings } from '../stt';

export const VOICE_SAVED_INDICATOR_MS = 2000;

type SavedTimer = ReturnType<typeof setTimeout>;
type VoiceSettingsListener = (snapshot: VoiceSettingsCategorySnapshot) => void;

export interface VoiceSettingsCategorySnapshot {
  sttSettings: STTSettings;
  voiceSaved: boolean;
}

export interface VoiceSettingsCategoryControllerOptions {
  loadVoiceSettings?: () => Promise<STTSettings | null>;
  saveVoiceSettings?: (settings: STTSettings) => Promise<boolean>;
  setSavedTimer?: (callback: () => void, ms: number) => SavedTimer;
  clearSavedTimer?: (timer: SavedTimer) => void;
}

export interface VoiceSettingsCategoryController {
  getSnapshot(): VoiceSettingsCategorySnapshot;
  subscribe(listener: VoiceSettingsListener): () => void;
  load(): Promise<void>;
  setSttSettings(update: SetStateAction<STTSettings>): void;
  save(): Promise<void>;
  reset(): void;
  dispose(): void;
}

class DefaultVoiceSettingsCategoryController implements VoiceSettingsCategoryController {
  private readonly loadVoiceSettings: () => Promise<STTSettings | null>;
  private readonly saveVoiceSettings: (settings: STTSettings) => Promise<boolean>;
  private readonly setSavedTimer: (callback: () => void, ms: number) => SavedTimer;
  private readonly clearSavedTimer: (timer: SavedTimer) => void;
  private readonly listeners = new Set<VoiceSettingsListener>();
  private snapshot: VoiceSettingsCategorySnapshot = {
    sttSettings: createDefaultVoiceSettings(),
    voiceSaved: false,
  };
  private savedTimer: SavedTimer | null = null;
  private loadGeneration = 0;
  private disposed = false;

  constructor(options: VoiceSettingsCategoryControllerOptions = {}) {
    this.loadVoiceSettings = options.loadVoiceSettings ?? loadStoredVoiceSettings;
    this.saveVoiceSettings = options.saveVoiceSettings ?? saveStoredVoiceSettings;
    this.setSavedTimer = options.setSavedTimer ?? setTimeout;
    this.clearSavedTimer = options.clearSavedTimer ?? clearTimeout;
  }

  getSnapshot(): VoiceSettingsCategorySnapshot {
    return this.snapshot;
  }

  subscribe(listener: VoiceSettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async load(): Promise<void> {
    const generation = ++this.loadGeneration;
    const loadedSettings = await this.loadVoiceSettings();
    if (this.disposed || generation !== this.loadGeneration || !loadedSettings) return;

    this.replaceSnapshot({
      ...this.snapshot,
      sttSettings: mergeVoiceSettings(loadedSettings),
    });
  }

  setSttSettings(update: SetStateAction<STTSettings>): void {
    const nextSettings = typeof update === 'function'
      ? update(this.snapshot.sttSettings)
      : update;

    this.replaceSnapshot({
      ...this.snapshot,
      sttSettings: mergeVoiceSettings(nextSettings),
    });
  }

  async save(): Promise<void> {
    const settings = mergeVoiceSettings(this.snapshot.sttSettings);
    const saved = await this.saveVoiceSettings(settings);
    if (this.disposed || !saved) return;

    this.replaceSnapshot({ ...this.snapshot, sttSettings: settings, voiceSaved: true });
    this.restartSavedTimer();
  }

  reset(): void {
    this.loadGeneration += 1;
    this.clearSavedIndicatorTimer();
    this.replaceSnapshot({
      sttSettings: createDefaultVoiceSettings(),
      voiceSaved: false,
    });
  }

  dispose(): void {
    this.disposed = true;
    this.loadGeneration += 1;
    this.clearSavedIndicatorTimer();
    this.listeners.clear();
  }

  private restartSavedTimer(): void {
    this.clearSavedIndicatorTimer();
    this.savedTimer = this.setSavedTimer(() => {
      this.savedTimer = null;
      if (this.disposed) return;
      this.replaceSnapshot({ ...this.snapshot, voiceSaved: false });
    }, VOICE_SAVED_INDICATOR_MS);
  }

  private clearSavedIndicatorTimer(): void {
    if (!this.savedTimer) return;
    this.clearSavedTimer(this.savedTimer);
    this.savedTimer = null;
  }

  private replaceSnapshot(snapshot: VoiceSettingsCategorySnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}

export function createVoiceSettingsCategoryController(
  options: VoiceSettingsCategoryControllerOptions = {},
): VoiceSettingsCategoryController {
  return new DefaultVoiceSettingsCategoryController(options);
}

export function useVoiceSettingsCategory() {
  const controllerRef = useRef<VoiceSettingsCategoryController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createVoiceSettingsCategoryController();
  }
  const controller = controllerRef.current;
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot());

  useEffect(() => controller.subscribe(setSnapshot), [controller]);

  useEffect(() => {
    void controller.load();
    return () => controller.dispose();
  }, [controller]);

  const setSttSettings = useCallback<Dispatch<SetStateAction<STTSettings>>>((update) => {
    controller.setSttSettings(update);
  }, [controller]);

  const saveVoice = useCallback(() => controller.save(), [controller]);
  const resetVoiceSettings = useCallback(() => controller.reset(), [controller]);

  return {
    sttSettings: snapshot.sttSettings,
    setSttSettings,
    saveVoice,
    voiceSaved: snapshot.voiceSaved,
    isWebSpeech: Platform.OS === 'web',
    resetVoiceSettings,
  };
}
