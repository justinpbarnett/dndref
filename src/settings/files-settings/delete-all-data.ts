import { getErrorMessage } from "../../utils/error-message";
import type { FilesSettingsServices } from "./files-settings-controller-options";
import type { FilesSettingsCategorySnapshot } from "./files-settings-snapshot";

type DeleteAllFilesSettingsDataOptions = {
  isDisposed: () => boolean;
  resetSnapshotAfterDelete: () => void;
  services: FilesSettingsServices;
  updateSnapshot: (patch: Partial<FilesSettingsCategorySnapshot>) => void;
};

export async function deleteAllFilesSettingsData({
  isDisposed,
  resetSnapshotAfterDelete,
  services,
  updateSnapshot,
}: DeleteAllFilesSettingsDataOptions): Promise<void> {
  const confirmed = await services.confirmDeleteAllData();
  if (isDisposed() || !confirmed) return;

  updateSnapshot({ deleteAllPending: true, deleteAllStatus: "" });
  try {
    services.stopSession();
    await services.resetStoredAppData();
    if (isDisposed()) return;

    services.onDeleteAllDataReset();
    resetSnapshotAfterDelete();
  } catch (e: unknown) {
    if (!isDisposed()) updateSnapshot({ deleteAllStatus: `Delete failed: ${getErrorMessage(e)}` });
  } finally {
    if (!isDisposed()) updateSnapshot({ deleteAllPending: false });
  }
}
