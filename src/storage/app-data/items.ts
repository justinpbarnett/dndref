import { appDataStorage } from "../../context/data-sources";
import { AsyncOperationQueue } from "../../utils/async-operation-queue";
import {
  allowAppDataCacheWrites,
  canPersistAppDataCache,
  createAppDataWriteToken,
  isAppDataWriteTokenCurrent,
} from "./write-gate";

const appDataWriteQueue = new AsyncOperationQueue();

export function createAppDataCacheSession() {
  const token = createAppDataWriteToken();
  return {
    getItem: (key: string) => getAppDataItem(key, token),
    setItem: (key: string, value: string) => setAppDataItem(key, value, { cache: true, token }),
  };
}

export async function getAppDataItem(key: string, token = createAppDataWriteToken()): Promise<string | null> {
  const value = await appDataStorage.getItem(key);
  return isAppDataWriteTokenCurrent(token) ? value : null;
}

export async function setAppDataItem(
  key: string,
  value: string,
  options: { cache?: boolean; token?: number } = {},
): Promise<boolean> {
  const { cache = false, token = createAppDataWriteToken() } = options;
  return appDataWriteQueue.run(async () => {
    const canPersist = cache ? canPersistAppDataCache : isAppDataWriteTokenCurrent;
    if (!canPersist(token)) return false;

    await appDataStorage.setItem(key, value);
    const saved = canPersist(token);
    if (saved && !cache) allowAppDataCacheWrites();
    return saved;
  });
}

export const waitForAppDataWrites = (): Promise<void> => appDataWriteQueue.wait();
export const resetAppDataItemQueueForTests = (): void => appDataWriteQueue.reset();
