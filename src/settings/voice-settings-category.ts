import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Platform } from "react-native";

import {
  createDefaultVoiceSettings,
  loadVoiceSettings as loadStoredVoiceSettings,
  mergeVoiceSettings,
  saveVoiceSettings as saveStoredVoiceSettings,
} from "../storage/app-data";
import type { STTSettings } from "../stt";
import { SnapshotStore } from "../utils/snapshot-store";

export const VOICE_SAVED_INDICATOR_MS = 2000;

type SavedTimer = ReturnType<typeof setTimeout>;
type VoiceSettingsServices = Required<VoiceSettingsCategoryControllerOptions>;

export type VoiceSettingsCategorySnapshot = { sttSettings: STTSettings; voiceSaved: boolean };

export interface VoiceSettingsCategoryControllerOptions {
  loadVoiceSettings?: () => Promise<STTSettings | null>;
  saveVoiceSettings?: (settings: STTSettings) => Promise<boolean>;
  setSavedTimer?: (callback: () => void, ms: number) => SavedTimer;
  clearSavedTimer?: (timer: SavedTimer) => void;
}

export type VoiceSettingsCategoryController = DefaultVoiceSettingsCategoryController;

class DefaultVoiceSettingsCategoryController extends SnapshotStore<VoiceSettingsCategorySnapshot> {
  private readonly services: VoiceSettingsServices;
  private savedTimer: SavedTimer | null = null;
  private loadGeneration = 0;
  private disposed = false;

  constructor(options: VoiceSettingsCategoryControllerOptions = {}) {
    super({ sttSettings: createDefaultVoiceSettings(), voiceSaved: false });
    this.services = {
      loadVoiceSettings: options.loadVoiceSettings ?? loadStoredVoiceSettings,
      saveVoiceSettings: options.saveVoiceSettings ?? saveStoredVoiceSettings,
      setSavedTimer: options.setSavedTimer ?? setTimeout,
      clearSavedTimer: options.clearSavedTimer ?? clearTimeout,
    };
  }

  async load(): Promise<void> {
    const generation = ++this.loadGeneration;
    const loadedSettings = await this.services.loadVoiceSettings();
    if (this.disposed || generation !== this.loadGeneration || !loadedSettings) return;

    this.updateSnapshot({ sttSettings: mergeVoiceSettings(loadedSettings) });
  }

  setSttSettings(update: SetStateAction<STTSettings>): void {
    const nextSettings = typeof update === "function" ? update(this.snapshot.sttSettings) : update;

    this.updateSnapshot({ sttSettings: mergeVoiceSettings(nextSettings) });
  }

  async save(): Promise<void> {
    const settingsToSave = mergeVoiceSettings(this.snapshot.sttSettings);
    const saved = await this.services.saveVoiceSettings(settingsToSave);
    if (this.disposed || !saved) return;

    this.updateSnapshot({ voiceSaved: true });
    this.restartSavedTimer();
  }

  reset = (): void =>
    void ((this.loadGeneration += 1),
    this.clearSavedIndicatorTimer(),
    this.replaceSnapshot({ sttSettings: createDefaultVoiceSettings(), voiceSaved: false }));

  dispose(): void {
    this.disposed = true;
    this.loadGeneration += 1;
    this.clearSavedIndicatorTimer();
    this.clearSnapshotListeners();
  }

  private restartSavedTimer(): void {
    this.clearSavedIndicatorTimer();
    this.savedTimer = this.services.setSavedTimer(() => {
      this.savedTimer = null;
      if (this.disposed) return;
      this.updateSnapshot({ voiceSaved: false });
    }, VOICE_SAVED_INDICATOR_MS);
  }

  private clearSavedIndicatorTimer(): void {
    if (!this.savedTimer) return;
    this.services.clearSavedTimer(this.savedTimer);
    this.savedTimer = null;
  }
}

export const createVoiceSettingsCategoryController = (
  options: VoiceSettingsCategoryControllerOptions = {},
): VoiceSettingsCategoryController => new DefaultVoiceSettingsCategoryController(options);

export function useVoiceSettingsCategory() {
  const controllerRef = useRef<VoiceSettingsCategoryController | null>(null);
  if (!controllerRef.current) controllerRef.current = createVoiceSettingsCategoryController();
  const controller = controllerRef.current;
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot());

  useEffect(() => controller.subscribe(setSnapshot), [controller]);

  useEffect(() => {
    void controller.load();
    return () => controller.dispose();
  }, [controller]);

  const setSttSettings = useCallback<Dispatch<SetStateAction<STTSettings>>>(
    (update) => controller.setSttSettings(update),
    [controller],
  );

  const saveVoice = useCallback(() => controller.save(), [controller]);
  const resetVoiceSettings = useCallback(() => controller.reset(), [controller]);

  return {
    sttSettings: snapshot.sttSettings,
    setSttSettings,
    saveVoice,
    voiceSaved: snapshot.voiceSaved,
    isWebSpeech: Platform.OS === "web",
    resetVoiceSettings,
  };
}
