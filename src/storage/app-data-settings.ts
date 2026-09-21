import { DEFAULT_STT_SETTINGS, STT_SETTINGS_KEY, type STTSettings } from "../stt/index";
import {
  createDefaultDataSourceSettings,
  DEFAULT_DATA_SOURCES_SETTINGS,
  mergeDataSourceSettings,
  type DataSourcesSettings,
} from "./app-data/data-source-settings-model";
import { getAppDataItem, setAppDataItem } from "./app-data-core";
import { DATA_SOURCES_KEY } from "./keys";

export {
  createDefaultDataSourceSettings,
  DEFAULT_DATA_SOURCES_SETTINGS,
  mergeDataSourceSettings,
  type DataSourcesSettings,
} from "./app-data/data-source-settings-model";

type VoiceSettingsPatch = Partial<Record<keyof STTSettings, unknown>>;

export const createDefaultVoiceSettings = (): STTSettings => ({ ...DEFAULT_STT_SETTINGS });

function normalizeVoiceSettings(settings: unknown): STTSettings {
  const patch = settings !== null && typeof settings === "object" ? (settings as VoiceSettingsPatch) : {};
  const defaultSettings = createDefaultVoiceSettings();

  const provider =
    patch.provider === "deepgram" || patch.provider === "web-speech" ? patch.provider : defaultSettings.provider;
  const deepgramApiKey =
    typeof patch.deepgramApiKey === "string" ? patch.deepgramApiKey : defaultSettings.deepgramApiKey;

  return { provider, deepgramApiKey };
}

export const mergeVoiceSettings: (settings?: Partial<STTSettings> | null) => STTSettings = normalizeVoiceSettings;
export const loadVoiceSettings = (): Promise<STTSettings | null> =>
  loadJsonSetting(STT_SETTINGS_KEY, normalizeVoiceSettings, "voice settings");
export const saveVoiceSettings = (settings: STTSettings): Promise<boolean> =>
  saveJsonSetting(STT_SETTINGS_KEY, mergeVoiceSettings(settings), "voice settings");

export const loadDataSourceSettings = (): Promise<DataSourcesSettings | null> =>
  loadJsonSetting(
    DATA_SOURCES_KEY,
    (value) => mergeDataSourceSettings(value as Partial<DataSourcesSettings>),
    "data source settings",
  );

export const saveDataSourceSettings = (settings: DataSourcesSettings): Promise<boolean> =>
  saveJsonSetting(DATA_SOURCES_KEY, settings, "data source settings");

async function loadJsonSetting<T>(key: string, normalize: (value: unknown) => T, label: string): Promise<T | null> {
  let raw: string | null;
  try {
    raw = await getAppDataItem(key);
  } catch (e) {
    console.warn(`[dnd-ref] Failed to load ${label}:`, e);
    return null;
  }

  if (!raw) return null;

  try {
    return normalize(JSON.parse(raw));
  } catch (e) {
    console.warn(`[dnd-ref] Failed to parse ${label}:`, e);
    return null;
  }
}

async function saveJsonSetting(key: string, value: unknown, label: string): Promise<boolean> {
  try {
    return await setAppDataItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[dnd-ref] Failed to save ${label}:`, e);
    return false;
  }
}
