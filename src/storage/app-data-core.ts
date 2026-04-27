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

export async function getAppDataItem(
  key: string,
  token = createAppDataWriteToken(),
): Promise<string | null> {
  const value = await AsyncStorage.getItem(key);
  return isAppDataWriteTokenCurrent(token) ? value : null;
}

export async function setAppDataItem(
  key: string,
  value: string,
  options: { cache?: boolean; token?: number } = {},
): Promise<boolean> {
  const { cache = false, token = createAppDataWriteToken() } = options;
  const operation = appDataWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const canPersist = cache ? canPersistAppDataCache : canPersistAppData;
      if (!canPersist(token)) return false;

      await AsyncStorage.setItem(key, value);
      const saved = canPersist(token);
      if (saved && !cache) allowAppDataCacheWrites();
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

export function resetAppDataCoreControlsForTests(): void {
  appDataResetGeneration = 0;
  appDataResetActive = false;
  cacheWritesBlockedForGeneration = null;
  appDataWriteQueue = Promise.resolve();
}
