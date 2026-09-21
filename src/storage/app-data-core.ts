import { appDataStorage } from "../context/data-sources";
import {
  createAppDataCacheSession,
  getAppDataItem,
  resetAppDataItemQueueForTests,
  setAppDataItem,
  waitForAppDataWrites,
} from "./app-data/items";
import { isAppStorageKey } from "./app-data/storage-keys";
import {
  allowAppDataCacheWrites,
  beginAppDataReset,
  canPersistAppDataCache,
  createAppDataWriteToken,
  finishAppDataReset,
  isAppDataWriteTokenCurrent,
  resetAppDataWriteGateForTests,
} from "./app-data/write-gate";

export { createAppDataCacheSession, getAppDataItem, setAppDataItem, waitForAppDataWrites } from "./app-data/items";
export { APP_STORAGE_KEYS, isAppStorageKey } from "./app-data/storage-keys";
export {
  allowAppDataCacheWrites,
  beginAppDataReset,
  canPersistAppDataCache,
  createAppDataWriteToken,
  finishAppDataReset,
  isAppDataWriteTokenCurrent,
} from "./app-data/write-gate";


export async function clearStoredAppData(): Promise<string[]> {
  const storedKeys = await appDataStorage.getAllKeys();
  const keys = Array.from(new Set(storedKeys.filter(isAppStorageKey)));
  if (keys.length > 0) await appDataStorage.multiRemove(keys);
  return keys;
}

export const resetAppDataCoreControlsForTests = (): void =>
  void (resetAppDataWriteGateForTests(), resetAppDataItemQueueForTests());
