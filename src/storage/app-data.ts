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

export interface UploadedFile {
  id: string;
  name: string;
  content: string;
}

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
let uploadMutationQueue: Promise<unknown> = Promise.resolve();

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

export async function getUploadedFiles(): Promise<UploadedFile[]> {
  return readUploadedFiles(createAppDataWriteToken());
}

export async function addUploadedFile(name: string, content: string): Promise<boolean> {
  return mutateUploadedFiles((uploads) => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return [...uploads, { id, name, content }];
  });
}

export async function removeUploadedFile(id: string): Promise<boolean> {
  return mutateUploadedFiles((uploads) => uploads.filter((u) => u.id !== id));
}

export async function waitForUploadedFileMutations(): Promise<void> {
  await uploadMutationQueue.catch(() => undefined);
}

function isUploadedFile(value: unknown): value is UploadedFile {
  return !!value &&
    typeof value === 'object' &&
    typeof (value as UploadedFile).id === 'string' &&
    typeof (value as UploadedFile).name === 'string' &&
    typeof (value as UploadedFile).content === 'string';
}

async function readUploadedFiles(token: number): Promise<UploadedFile[]> {
  try {
    const raw = await getAppDataItem(UPLOADS_KEY, token);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isUploadedFile) : [];
  } catch (e) {
    console.warn('[dnd-ref] Failed to read uploads from storage:', e);
    return [];
  }
}

function mutateUploadedFiles(mutator: (uploads: UploadedFile[]) => UploadedFile[]): Promise<boolean> {
  const token = createAppDataWriteToken();
  const operation = uploadMutationQueue
    .catch(() => undefined)
    .then(async () => {
      if (!canPersistAppData(token)) return false;
      const uploads = await readUploadedFiles(token);
      if (!canPersistAppData(token)) return false;
      return setAppDataItem(UPLOADS_KEY, JSON.stringify(mutator(uploads)), { token });
    });

  uploadMutationQueue = operation.catch(() => undefined);
  return operation;
}

export interface AppDataCacheSession {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<boolean>;
}

export function createAppDataCacheSession(): AppDataCacheSession {
  const token = createAppDataWriteToken();
  return {
    getItem: (key) => getAppDataItem(key, token),
    setItem: (key, value) => setAppDataItem(key, value, { cache: true, token }),
  };
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
      const saved = canPersist(token);
      if (saved && !options.cache) allowAppDataCacheWrites();
      return saved;
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
    await waitForUploadedFileMutations();
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
  uploadMutationQueue = Promise.resolve();
}
