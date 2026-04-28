import {
  addUpload as addStoredUpload,
  getUploads as getStoredUploads,
  removeUpload as removeStoredUpload,
  type UploadedFile,
} from "../../entities/providers/file-upload";
import { resetStoredAppData as resetStoredLocalAppData } from "../../storage/app-data";
import { confirmDeleteAllData, pickFilesWithWebInput, type PickedTextFile } from "../files-settings-services";

export type { PickedTextFile } from "../files-settings-services";

export type FilesSettingsCategoryControllerOptions = {
  getUploads?: () => Promise<UploadedFile[]>;
  addUpload?: (name: string, content: string) => unknown | Promise<unknown>;
  removeUpload?: (id: string) => unknown | Promise<unknown>;
  pickFiles?: () => Promise<PickedTextFile[]>;
  confirmDeleteAllData?: () => Promise<boolean>;
  resetStoredAppData?: () => Promise<unknown>;
} & Partial<Record<"bumpUploads" | "stopSession" | "onDeleteAllDataReset", () => void>>;

export type FilesSettingsServices = Required<FilesSettingsCategoryControllerOptions>;

export function createFilesSettingsServices(
  options: FilesSettingsCategoryControllerOptions = {},
): FilesSettingsServices {
  return {
    getUploads: options.getUploads ?? getStoredUploads,
    addUpload: options.addUpload ?? addStoredUpload,
    removeUpload: options.removeUpload ?? removeStoredUpload,
    bumpUploads: options.bumpUploads ?? noop,
    pickFiles: options.pickFiles ?? pickFilesWithWebInput,
    confirmDeleteAllData: options.confirmDeleteAllData ?? confirmDeleteAllData,
    resetStoredAppData: options.resetStoredAppData ?? resetStoredLocalAppData,
    stopSession: options.stopSession ?? noop,
    onDeleteAllDataReset: options.onDeleteAllDataReset ?? noop,
  };
}

function noop(): void {}
