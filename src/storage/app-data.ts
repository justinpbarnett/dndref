import AsyncStorage from '@react-native-async-storage/async-storage';

import { STT_SETTINGS_KEY } from '../stt';
import {
  CARD_SIZE_KEY,
  COLOR_SCHEME_KEY,
  DATA_SOURCES_KEY,
  SRD_CACHE_KEY_PREFIX,
  UPLOADS_KEY,
} from './keys';

const APP_STORAGE_PREFIXES = ['dndref:', '@dnd-ref/'];
const INVALID_APP_DATA_TOKEN = -1;

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

let appDataResetGeneration = 0;
let appDataResetActive = false;
let cacheWritesBlockedForGeneration: number | null = null;
let appDataWriteQueue: Promise<unknown> = Promise.resolve();

export const APP_STORAGE_KEYS = [
  DATA_SOURCES_KEY,
  UPLOADS_KEY,
  STT_SETTINGS_KEY,
  CARD_SIZE_KEY,
  COLOR_SCHEME_KEY,
];

export function isAppStorageKey(key: string): boolean {
  return (
    APP_STORAGE_KEYS.includes(key) ||
    key.startsWith(SRD_CACHE_KEY_PREFIX) ||
    APP_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

export function createAppDataWriteToken(): number {
  return appDataResetActive ? INVALID_APP_DATA_TOKEN : appDataResetGeneration;
}

export function isAppDataWriteTokenCurrent(token: number): boolean {
  return token !== INVALID_APP_DATA_TOKEN &&
    token === appDataResetGeneration &&
    !appDataResetActive;
}

export function canPersistAppData(token: number): boolean {
  return isAppDataWriteTokenCurrent(token);
}

export function canPersistAppDataCache(token: number): boolean {
  return canPersistAppData(token) && cacheWritesBlockedForGeneration !== token;
}

export function allowAppDataCacheWrites(): void {
  cacheWritesBlockedForGeneration = null;
}

export function createDefaultDataSourceSettings(): DataSourcesSettings {
  return {
    ...DEFAULT_DATA_SOURCES_SETTINGS,
    srdSources: [...DEFAULT_DATA_SOURCES_SETTINGS.srdSources],
  };
}

export function mergeDataSourceSettings(
  settings: Partial<DataSourcesSettings> | null = {},
): DataSourcesSettings {
  const patch = settings ?? {};
  return {
    ...createDefaultDataSourceSettings(),
    ...patch,
    srdSources: Array.isArray(patch.srdSources)
      ? [...patch.srdSources]
      : [...DEFAULT_DATA_SOURCES_SETTINGS.srdSources],
  };
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
  const saved = await setAppDataItem(DATA_SOURCES_KEY, JSON.stringify(settings)).catch((e) => {
    console.warn('[dnd-ref] Failed to save data source settings:', e);
    return false;
  });
  if (saved) allowAppDataCacheWrites();
  return saved;
}

export async function getAppDataItem(key: string, token = createAppDataWriteToken()): Promise<string | null> {
  const value = await AsyncStorage.getItem(key);
  return isAppDataWriteTokenCurrent(token) ? value : null;
}

export async function setAppDataItem(
  key: string,
  value: string,
  options: { cache?: boolean; token?: number } = {},
): Promise<boolean> {
  const token = options.token ?? createAppDataWriteToken();
  const operation = appDataWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const canPersist = options.cache ? canPersistAppDataCache : canPersistAppData;
      if (!canPersist(token)) return false;
      await AsyncStorage.setItem(key, value);
      return canPersist(token);
    });

  appDataWriteQueue = operation.catch(() => undefined);
  return operation;
}

export async function waitForAppDataWrites(): Promise<void> {
  await appDataWriteQueue.catch(() => undefined);
}

export function beginAppDataReset(): number {
  appDataResetGeneration += 1;
  appDataResetActive = true;
  return appDataResetGeneration;
}

export function finishAppDataReset(generation: number): void {
  if (generation !== appDataResetGeneration) return;
  appDataResetActive = false;
  cacheWritesBlockedForGeneration = generation;
}

export async function resetStoredAppData(options: {
  beforeClear?: () => Promise<void>;
} = {}): Promise<string[]> {
  const generation = beginAppDataReset();
  try {
    await options.beforeClear?.();
    await waitForAppDataWrites();
    return await clearStoredAppData();
  } finally {
    finishAppDataReset(generation);
  }
}

export async function getStoredAppDataKeys(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return Array.from(new Set(keys.filter(isAppStorageKey)));
}

export async function clearStoredAppData(): Promise<string[]> {
  const keys = await getStoredAppDataKeys();
  if (keys.length > 0) {
    await AsyncStorage.multiRemove(keys);
  }
  return keys;
}

export function resetAppDataControlsForTests(): void {
  appDataResetGeneration = 0;
  appDataResetActive = false;
  cacheWritesBlockedForGeneration = null;
  appDataWriteQueue = Promise.resolve();
}
