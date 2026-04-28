import { DEFAULT_STT_SETTINGS, STT_SETTINGS_KEY, type STTSettings } from '../stt';
import { getAppDataItem, setAppDataItem } from './app-data-core';
import { DATA_SOURCES_KEY } from './keys';

export interface DataSourcesSettings { srdEnabled: boolean; srdSources: string[]; kankaToken: string; kankaCampaignId: string; homebreweryUrl: string; notionToken: string; notionPageIds: string; googleDocsUrl: string; aiApiKey: string }

export const DEFAULT_DATA_SOURCES_SETTINGS: DataSourcesSettings = {
  srdEnabled: true,
  srdSources: ['wotc-srd'],
  kankaToken: '',
  kankaCampaignId: '',
  homebreweryUrl: '',
  notionToken: '',
  notionPageIds: '',
  googleDocsUrl: '',
  aiApiKey: '',
};

export function createDefaultDataSourceSettings(): DataSourcesSettings { return { ...DEFAULT_DATA_SOURCES_SETTINGS, srdSources: [...DEFAULT_DATA_SOURCES_SETTINGS.srdSources] }; }

export function mergeDataSourceSettings(
  settings?: Partial<DataSourcesSettings> | null,
): DataSourcesSettings {
  const patch = settings ?? {};
  const defaultSettings = createDefaultDataSourceSettings();
  const srdSources = Array.isArray(patch.srdSources)
    ? [...patch.srdSources]
    : defaultSettings.srdSources;

  return { ...defaultSettings, ...patch, srdSources };
}

type VoiceSettingsPatch = Partial<Record<keyof STTSettings, unknown>>;

function isVoiceSettingsPatch(value: unknown): value is VoiceSettingsPatch { return value !== null && typeof value === 'object'; }
function isVoiceProvider(value: unknown): value is STTSettings['provider'] { return value === 'deepgram' || value === 'web-speech'; }

export function createDefaultVoiceSettings(): STTSettings { return { ...DEFAULT_STT_SETTINGS }; }

function normalizeVoiceSettings(settings: unknown): STTSettings {
  const patch = isVoiceSettingsPatch(settings) ? settings : {};
  const defaultSettings = createDefaultVoiceSettings();

  const provider = isVoiceProvider(patch.provider)
    ? patch.provider
    : defaultSettings.provider;
  const deepgramApiKey = typeof patch.deepgramApiKey === 'string'
    ? patch.deepgramApiKey
    : defaultSettings.deepgramApiKey;

  return { provider, deepgramApiKey };
}

export function mergeVoiceSettings(settings?: Partial<STTSettings> | null): STTSettings { return normalizeVoiceSettings(settings); }
export function loadVoiceSettings(): Promise<STTSettings | null> { return loadJsonSetting(STT_SETTINGS_KEY, normalizeVoiceSettings, 'voice settings'); }
export function saveVoiceSettings(settings: STTSettings): Promise<boolean> { return saveJsonSetting(STT_SETTINGS_KEY, mergeVoiceSettings(settings), 'voice settings'); }

export function loadDataSourceSettings(): Promise<DataSourcesSettings | null> {
  return loadJsonSetting(
    DATA_SOURCES_KEY,
    (value) => mergeDataSourceSettings(value as Partial<DataSourcesSettings>),
    'data source settings',
  );
}

export function saveDataSourceSettings(settings: DataSourcesSettings): Promise<boolean> { return saveJsonSetting(DATA_SOURCES_KEY, settings, 'data source settings'); }

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
