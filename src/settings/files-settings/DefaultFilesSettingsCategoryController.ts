import type { SetStateAction } from "react";
import { SnapshotStore } from "../../utils/snapshot-store";
import { deleteAllFilesSettingsData } from "./delete-all-data";
import {
  createFilesSettingsServices,
  type FilesSettingsCategoryControllerOptions,
  type FilesSettingsServices,
  type PickedTextFile,
} from "./files-settings-controller-options";
import type { FilesSettingsCategorySnapshot } from "./files-settings-snapshot";

export type { FilesSettingsCategoryControllerOptions, PickedTextFile } from "./files-settings-controller-options";
export type { FilesSettingsCategorySnapshot } from "./files-settings-snapshot";

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
    this.services = createFilesSettingsServices(options);
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
    await deleteAllFilesSettingsData({
      isDisposed: () => this.disposed,
      resetSnapshotAfterDelete: () => this.resetSnapshotAfterDeleteAllData(),
      services: this.services,
      updateSnapshot: (patch) => this.updateSnapshot(patch),
    });
  }

  private resetSnapshotAfterDeleteAllData(): void {
    this.refreshGeneration += 1;
    this.updateSnapshot({
      uploads: [],
      removingUploadId: null,
      pasteFileName: "",
      pasteContent: "",
      deleteAllStatus: "All local app data was deleted.",
    });
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

const resolveStringUpdate = (update: SetStateAction<string>, current: string) =>
  typeof update === "function" ? update(current) : update;

export const createFilesSettingsCategoryController = (options: FilesSettingsCategoryControllerOptions = {}) =>
  new DefaultFilesSettingsCategoryController(options);

export type FilesSettingsCategoryController = ReturnType<typeof createFilesSettingsCategoryController>;
