import {
  beginAppDataReset,
  clearStoredAppData,
  finishAppDataReset,
  resetAppDataCoreControlsForTests,
  waitForAppDataWrites,
} from "../app-data-core";
import { resetUploadedFileMutationQueueForTests, waitForUploadedFileMutations } from "../app-data-uploads";

export async function resetStoredAppData(options: { beforeClear?: () => Promise<void> } = {}): Promise<string[]> {
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

export const resetAppDataControlsForTests = (): void =>
  void (resetAppDataCoreControlsForTests(), resetUploadedFileMutationQueueForTests());
