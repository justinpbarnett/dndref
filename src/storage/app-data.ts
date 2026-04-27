export {
  APP_STORAGE_KEYS,
  allowAppDataCacheWrites,
  beginAppDataReset,
  canPersistAppData,
  canPersistAppDataCache,
  clearStoredAppData,
  createAppDataCacheSession,
  createAppDataWriteToken,
  finishAppDataReset,
  getAppDataItem,
  getStoredAppDataKeys,
  isAppDataWriteTokenCurrent,
  isAppStorageKey,
  setAppDataItem,
  waitForAppDataWrites,
  type AppDataCacheSession,
} from './app-data-core';
export {
  DEFAULT_DATA_SOURCES_SETTINGS,
  createDefaultDataSourceSettings,
  createDefaultVoiceSettings,
  loadDataSourceSettings,
  loadVoiceSettings,
  mergeDataSourceSettings,
  mergeVoiceSettings,
  saveDataSourceSettings,
  saveVoiceSettings,
  type DataSourcesSettings,
} from './app-data-settings';
export {
  addUploadedFile,
  getUploadedFiles,
  removeUploadedFile,
  waitForUploadedFileMutations,
  type UploadedFile,
} from './app-data-uploads';

import {
  beginAppDataReset,
  clearStoredAppData,
  finishAppDataReset,
  resetAppDataCoreControlsForTests,
  waitForAppDataWrites,
} from './app-data-core';
import {
  resetUploadedFileMutationQueueForTests,
  waitForUploadedFileMutations,
} from './app-data-uploads';

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

export function resetAppDataControlsForTests(): void {
  resetAppDataCoreControlsForTests();
  resetUploadedFileMutationQueueForTests();
}
