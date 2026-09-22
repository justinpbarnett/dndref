import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import {
  addUploadedFile as addStoredUpload,
  getUploadedFiles as getStoredUploads,
  removeUploadedFile as removeStoredUpload,
  type UploadedFile,
} from "../storage/uploads";
import { resetStoredAppData as resetStoredLocalAppData } from "../storage/app-data";
import { getErrorMessage } from "../utils/error-message";
import { SnapshotStore } from "../utils/snapshot-store";
import { confirmDeleteAllData, pickFilesWithWebInput, type PickedTextFile } from "./files-settings-services";

export type { PickedTextFile } from "./files-settings-services";

export type FilesSettingsCategorySnapshot = {
  uploads: UploadedFile[];
  removingUploadId: string | null;
  deleteAllPending: boolean;
} & Record<"pasteFileName" | "pasteContent" | "deleteAllStatus", string>;

export type FilesSettingsCategoryControllerOptions = {
  getUploads?: () => Promise<UploadedFile[]>;
  addUpload?: (name: string, content: string) => unknown | Promise<unknown>;
  removeUpload?: (id: string) => unknown | Promise<unknown>;
  pickFiles?: () => Promise<PickedTextFile[]>;
  confirmDeleteAllData?: () => Promise<boolean>;
  resetStoredAppData?: () => Promise<unknown>;
} & Partial<Record<"bumpUploads" | "stopSession" | "onDeleteAllDataReset", () => void>>;

type FilesSettingsServices = Required<FilesSettingsCategoryControllerOptions>;

function noop(): void {}

const withDefaults = (options: FilesSettingsCategoryControllerOptions): FilesSettingsServices => ({
  getUploads: options.getUploads ?? getStoredUploads,
  addUpload: options.addUpload ?? addStoredUpload,
  removeUpload: options.removeUpload ?? removeStoredUpload,
  bumpUploads: options.bumpUploads ?? noop,
  pickFiles: options.pickFiles ?? pickFilesWithWebInput,
  confirmDeleteAllData: options.confirmDeleteAllData ?? confirmDeleteAllData,
  resetStoredAppData: options.resetStoredAppData ?? resetStoredLocalAppData,
  stopSession: options.stopSession ?? noop,
  onDeleteAllDataReset: options.onDeleteAllDataReset ?? noop,
});

const resolveStringUpdate = (update: SetStateAction<string>, current: string) =>
  typeof update === "function" ? update(current) : update;

class DefaultFilesSettingsCategoryController extends SnapshotStore<FilesSettingsCategorySnapshot> {
  private readonly services: FilesSettingsServices;
  private refreshGeneration = 0;
  private disposed = false;

  constructor(options: FilesSettingsCategoryControllerOptions = {}) {
    super({
      uploads: [],
      removingUploadId: null,
      pasteFileName: "",
      pasteContent: "",
      deleteAllPending: false,
      deleteAllStatus: "",
    });
    this.services = withDefaults(options);
  }

  async load(): Promise<void> {
    await this.refreshUploads();
  }

  setPasteFileName = (update: SetStateAction<string>): void =>
    this.updateSnapshot({ pasteFileName: resolveStringUpdate(update, this.snapshot.pasteFileName) });

  setPasteContent = (update: SetStateAction<string>): void =>
    this.updateSnapshot({ pasteContent: resolveStringUpdate(update, this.snapshot.pasteContent) });

  async saveUpload(name: string, content: string): Promise<void> {
    await this.services.addUpload(name, content);
    await this.refreshUploads();
  }

  async pickFilesWeb(): Promise<void> {
    const files = await this.services.pickFiles();
    await Promise.all(files.map(async (file) => this.services.addUpload(file.name, await file.text())));
    await this.refreshUploads();
  }

  async addPastedContent(): Promise<void> {
    const content = this.snapshot.pasteContent;
    if (!content.trim()) return;

    const name = this.snapshot.pasteFileName.trim() || "Pasted Content.md";
    await this.services.addUpload(name, content);
    this.updateSnapshot({ pasteFileName: "", pasteContent: "" });
    await this.refreshUploads();
  }

  async deleteUpload(id: string): Promise<void> {
    this.updateSnapshot({ removingUploadId: id });
    try {
      await this.services.removeUpload(id);
      await this.refreshUploads();
    } finally {
      if (!this.disposed && this.snapshot.removingUploadId === id) {
        this.updateSnapshot({ removingUploadId: null });
      }
    }
  }

  async deleteAllData(): Promise<void> {
    const confirmed = await this.services.confirmDeleteAllData();
    if (this.disposed || !confirmed) return;

    this.updateSnapshot({ deleteAllPending: true, deleteAllStatus: "" });
    try {
      this.services.stopSession();
      await this.services.resetStoredAppData();
      if (this.disposed) return;

      this.services.onDeleteAllDataReset();
      this.refreshGeneration += 1;
      this.updateSnapshot({
        uploads: [],
        removingUploadId: null,
        pasteFileName: "",
        pasteContent: "",
        deleteAllStatus: "All local app data was deleted.",
      });
    } catch (e: unknown) {
      if (!this.disposed) this.updateSnapshot({ deleteAllStatus: `Delete failed: ${getErrorMessage(e)}` });
    } finally {
      if (!this.disposed) this.updateSnapshot({ deleteAllPending: false });
    }
  }

  dispose = (): void => void ((this.disposed = true), (this.refreshGeneration += 1), this.clearSnapshotListeners());

  private async refreshUploads(): Promise<void> {
    const generation = ++this.refreshGeneration;
    const uploads = await this.services.getUploads();
    if (this.disposed || generation !== this.refreshGeneration) return;

    this.updateSnapshot({ uploads });
    this.services.bumpUploads();
  }
}

export const createFilesSettingsCategoryController = (options: FilesSettingsCategoryControllerOptions = {}) =>
  new DefaultFilesSettingsCategoryController(options);

export type FilesSettingsCategoryController = ReturnType<typeof createFilesSettingsCategoryController>;

export function useFilesSettingsCategory(options: FilesSettingsCategoryControllerOptions) {
  const controllerRef = useRef<FilesSettingsCategoryController | null>(null);
  if (!controllerRef.current) controllerRef.current = createFilesSettingsCategoryController(options);
  const controller = controllerRef.current;
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot());

  useEffect(() => controller.subscribe(setSnapshot), [controller]);

  useEffect(() => {
    void controller.load();
    return () => controller.dispose();
  }, [controller]);

  const setPasteFileName = useCallback<Dispatch<SetStateAction<string>>>(
    (update) => controller.setPasteFileName(update),
    [controller],
  );
  const setPasteContent = useCallback<Dispatch<SetStateAction<string>>>(
    (update) => controller.setPasteContent(update),
    [controller],
  );

  return {
    uploads: snapshot.uploads,
    removingUploadId: snapshot.removingUploadId,
    pasteFileName: snapshot.pasteFileName,
    setPasteFileName,
    pasteContent: snapshot.pasteContent,
    setPasteContent,
    pickFilesWeb: useCallback(() => controller.pickFilesWeb(), [controller]),
    handlePasteAdd: useCallback(() => controller.addPastedContent(), [controller]),
    handleDeleteUpload: useCallback((id: string) => controller.deleteUpload(id), [controller]),
    handleDeleteAllData: useCallback(() => controller.deleteAllData(), [controller]),
    saveUpload: useCallback((name: string, content: string) => controller.saveUpload(name, content), [controller]),
    deleteAllPending: snapshot.deleteAllPending,
    deleteAllStatus: snapshot.deleteAllStatus,
  };
}
