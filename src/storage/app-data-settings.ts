import { DEFAULT_STT_SETTINGS, STT_SETTINGS_KEY, type STTSettings } from '../stt';
import { DATA_SOURCES_KEY } from './keys';
import { getAppDataItem, setAppDataItem } from './app-data-core';

export interface DataSourcesSettings {
  srdEnabled: boolean;
  srdSources: string[];
  kankaToken: string;
  kankaCampaignId: string;
  homebreweryUrl: string;
  notionToken: string;
  notionPageIds: string;
  googleDocsUrl: string;
  aiApiKey: string;
}

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

export function createDefaultDataSourceSettings(): DataSourcesSettings {
  return {
    ...DEFAULT_DATA_SOURCES_SETTINGS,
    srdSources: [...DEFAULT_DATA_SOURCES_SETTINGS.srdSources],
  };
}

export function mergeDataSourceSettings(
  settings?: Partial<DataSourcesSettings> | null,
): DataSourcesSettings {
  const patch = settings ?? {};
  const defaultSettings = createDefaultDataSourceSettings();
  const srdSources = Array.isArray(patch.srdSources)
    ? [...patch.srdSources]
    : defaultSettings.srdSources;

  return {
    ...defaultSettings,
    ...patch,
    srdSources,
  };
}

type VoiceSettingsPatch = Partial<Record<keyof STTSettings, unknown>>;

function isVoiceSettingsPatch(value: unknown): value is VoiceSettingsPatch {
  return value !== null && typeof value === 'object';
}

function isVoiceProvider(value: unknown): value is STTSettings['provider'] {
  return value === 'deepgram' || value === 'web-speech';
}

export function createDefaultVoiceSettings(): STTSettings {
  return { ...DEFAULT_STT_SETTINGS };
}

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

export function mergeVoiceSettings(settings?: Partial<STTSettings> | null): STTSettings {
  return normalizeVoiceSettings(settings);
}

export async function loadVoiceSettings(): Promise<STTSettings | null> {
  let raw: string | null;
  try {
    raw = await getAppDataItem(STT_SETTINGS_KEY);
  } catch (e) {
    console.warn('[dnd-ref] Failed to load voice settings:', e);
    return null;
  }

  if (!raw) return null;

  try {
    return normalizeVoiceSettings(JSON.parse(raw));
  } catch (parseErr) {
    console.warn('[dnd-ref] Failed to parse voice settings:', parseErr);
    return null;
  }
}

export async function saveVoiceSettings(settings: STTSettings): Promise<boolean> {
  const serializedSettings = JSON.stringify(mergeVoiceSettings(settings));

  try {
    return await setAppDataItem(STT_SETTINGS_KEY, serializedSettings);
  } catch (e) {
    console.warn('[dnd-ref] Failed to save voice settings:', e);
    return false;
  }
}

export async function loadDataSourceSettings(): Promise<DataSourcesSettings | null> {
  let raw: string | null;
  try {
    raw = await getAppDataItem(DATA_SOURCES_KEY);
  } catch (e) {
    console.warn('[dnd-ref] Failed to load data source settings:', e);
    return null;
  }

  if (!raw) return null;

  try {
    return mergeDataSourceSettings(JSON.parse(raw) as Partial<DataSourcesSettings>);
  } catch (parseErr) {
    console.warn('[dnd-ref] Failed to parse data source settings:', parseErr);
    return null;
  }
}

export async function saveDataSourceSettings(settings: DataSourcesSettings): Promise<boolean> {
  const serializedSettings = JSON.stringify(settings);

  try {
    return await setAppDataItem(DATA_SOURCES_KEY, serializedSettings);
  } catch (e) {
    console.warn('[dnd-ref] Failed to save data source settings:', e);
    return false;
  }
}
