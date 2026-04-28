const INVALID_APP_DATA_TOKEN = -1;

let appDataResetGeneration = 0;
let appDataResetActive = false;
let cacheWritesBlockedForGeneration: number | null = null;

export const createAppDataWriteToken = (): number =>
  appDataResetActive ? INVALID_APP_DATA_TOKEN : appDataResetGeneration;

export const isAppDataWriteTokenCurrent = (token: number): boolean =>
  token !== INVALID_APP_DATA_TOKEN && token === appDataResetGeneration && !appDataResetActive;

export const canPersistAppDataCache = (token: number): boolean =>
  isAppDataWriteTokenCurrent(token) && cacheWritesBlockedForGeneration !== token;

export const allowAppDataCacheWrites = (): void => void (cacheWritesBlockedForGeneration = null);

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

export function resetAppDataWriteGateForTests(): void {
  appDataResetGeneration = 0;
  appDataResetActive = false;
  cacheWritesBlockedForGeneration = null;
}
