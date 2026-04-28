import AsyncStorage from "@react-native-async-storage/async-storage";

import { STT_SETTINGS_KEY } from "../stt";
import { CARD_SIZE_KEY, COLOR_SCHEME_KEY, DATA_SOURCES_KEY, SRD_CACHE_KEY_PREFIX, UPLOADS_KEY } from "./keys";

const INVALID_APP_DATA_TOKEN = -1;

let appDataResetGeneration = 0;
let appDataResetActive = false;
let cacheWritesBlockedForGeneration: number | null = null;
let appDataWriteQueue: Promise<unknown> = Promise.resolve();

export const APP_STORAGE_KEYS = [DATA_SOURCES_KEY, UPLOADS_KEY, STT_SETTINGS_KEY, CARD_SIZE_KEY, COLOR_SCHEME_KEY];

export const isAppStorageKey = (key: string): boolean =>
  APP_STORAGE_KEYS.includes(key) ||
  key.startsWith(SRD_CACHE_KEY_PREFIX) ||
  ["dndref:", "@dnd-ref/"].some((prefix) => key.startsWith(prefix));

export const createAppDataWriteToken = (): number =>
  appDataResetActive ? INVALID_APP_DATA_TOKEN : appDataResetGeneration;

export const isAppDataWriteTokenCurrent = (token: number): boolean =>
  token !== INVALID_APP_DATA_TOKEN && token === appDataResetGeneration && !appDataResetActive;

export const canPersistAppDataCache = (token: number): boolean =>
  isAppDataWriteTokenCurrent(token) && cacheWritesBlockedForGeneration !== token;
export function allowAppDataCacheWrites(): void {
  cacheWritesBlockedForGeneration = null;
}

export type AppDataCacheSession = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<boolean>;
};

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
  const { cache = false, token = createAppDataWriteToken() } = options;
  const operation = appDataWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const canPersist = cache ? canPersistAppDataCache : isAppDataWriteTokenCurrent;
      if (!canPersist(token)) return false;

      await AsyncStorage.setItem(key, value);
      const saved = canPersist(token);
      if (saved && !cache) allowAppDataCacheWrites();
      return saved;
    });

  appDataWriteQueue = operation.catch(() => undefined);
  return operation;
}

export const waitForAppDataWrites = (): Promise<void> => appDataWriteQueue.catch(() => undefined).then(() => undefined);

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

export async function clearStoredAppData(): Promise<string[]> {
  const storedKeys = await AsyncStorage.getAllKeys();
  const keys = Array.from(new Set(storedKeys.filter(isAppStorageKey)));
  if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  return keys;
}

export const resetAppDataCoreControlsForTests = (): void =>
  void ((appDataResetGeneration = 0),
  (appDataResetActive = false),
  (cacheWritesBlockedForGeneration = null),
  (appDataWriteQueue = Promise.resolve()));
