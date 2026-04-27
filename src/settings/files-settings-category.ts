import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, Platform } from 'react-native';

import {
  addUpload as addStoredUpload,
  getUploads as getStoredUploads,
  removeUpload as removeStoredUpload,
  type UploadedFile,
} from '../entities/providers/file-upload';
import { resetStoredAppData as resetStoredLocalAppData } from '../storage/app-data';

const DELETE_ALL_MESSAGE = 'This deletes uploads, pasted content, AI parsed files, saved settings, API keys, source URLs, cached SRD data, and the current session on this device.';
const PASTED_CONTENT_FILE_NAME = 'Pasted Content.md';

type FilesSettingsListener = (snapshot: FilesSettingsCategorySnapshot) => void;
type MaybePromise<T> = T | Promise<T>;

export interface PickedTextFile {
  name: string;
  text: () => Promise<string>;
}

export interface FilesSettingsCategorySnapshot {
  uploads: UploadedFile[];
  removingUploadId: string | null;
  pasteFileName: string;
  pasteContent: string;
  deleteAllPending: boolean;
  deleteAllStatus: string;
}

export interface FilesSettingsCategoryControllerOptions {
  getUploads?: () => Promise<UploadedFile[]>;
  addUpload?: (name: string, content: string) => MaybePromise<void>;
  removeUpload?: (id: string) => MaybePromise<void>;
  bumpUploads?: () => void;
  pickFiles?: () => Promise<PickedTextFile[]>;
  confirmDeleteAllData?: () => Promise<boolean>;
  resetStoredAppData?: () => Promise<unknown>;
  stopSession?: () => void;
  onDeleteAllDataReset?: () => void;
}

export interface FilesSettingsCategoryController {
  getSnapshot(): FilesSettingsCategorySnapshot;
  subscribe(listener: FilesSettingsListener): () => void;
  load(): Promise<void>;
  setPasteFileName(update: SetStateAction<string>): void;
  setPasteContent(update: SetStateAction<string>): void;
  saveUpload(name: string, content: string): Promise<void>;
  pickFilesWeb(): Promise<void>;
  addPastedContent(): Promise<void>;
  deleteUpload(id: string): Promise<void>;
  deleteAllData(): Promise<void>;
  reset(): void;
  dispose(): void;
}

class DefaultFilesSettingsCategoryController implements FilesSettingsCategoryController {
  private readonly getUploads: () => Promise<UploadedFile[]>;
  private readonly addUpload: (name: string, content: string) => MaybePromise<void>;
  private readonly removeUpload: (id: string) => MaybePromise<void>;
  private readonly bumpUploads: () => void;
  private readonly pickFiles: () => Promise<PickedTextFile[]>;
  private readonly confirmDeleteAllData: () => Promise<boolean>;
  private readonly resetStoredAppData: () => Promise<unknown>;
  private readonly stopSession: () => void;
  private readonly onDeleteAllDataReset: () => void;
  private readonly listeners = new Set<FilesSettingsListener>();
  private snapshot: FilesSettingsCategorySnapshot = createDefaultSnapshot();
  private refreshGeneration = 0;
  private disposed = false;

  constructor(options: FilesSettingsCategoryControllerOptions = {}) {
    this.getUploads = options.getUploads ?? getStoredUploads;
    this.addUpload = options.addUpload ?? addStoredUpload;
    this.removeUpload = options.removeUpload ?? removeStoredUpload;
    this.bumpUploads = options.bumpUploads ?? noop;
    this.pickFiles = options.pickFiles ?? pickFilesWithWebInput;
    this.confirmDeleteAllData = options.confirmDeleteAllData ?? confirmDeleteAllData;
    this.resetStoredAppData = options.resetStoredAppData ?? resetStoredLocalAppData;
    this.stopSession = options.stopSession ?? noop;
    this.onDeleteAllDataReset = options.onDeleteAllDataReset ?? noop;
  }

  getSnapshot(): FilesSettingsCategorySnapshot {
    return this.snapshot;
  }

  subscribe(listener: FilesSettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async load(): Promise<void> {
    await this.refreshUploads();
  }

  setPasteFileName(update: SetStateAction<string>): void {
    this.updateSnapshot({ pasteFileName: resolveStringUpdate(update, this.snapshot.pasteFileName) });
  }

  setPasteContent(update: SetStateAction<string>): void {
    this.updateSnapshot({ pasteContent: resolveStringUpdate(update, this.snapshot.pasteContent) });
  }

  async saveUpload(name: string, content: string): Promise<void> {
    await this.addUpload(name, content);
    await this.refreshUploads();
  }

  async pickFilesWeb(): Promise<void> {
    const files = await this.pickFiles();
    await Promise.all(files.map(async (file) => {
      await this.addUpload(file.name, await file.text());
    }));
    await this.refreshUploads();
  }

  async addPastedContent(): Promise<void> {
    const content = this.snapshot.pasteContent;
    if (!content.trim()) return;

    const name = this.snapshot.pasteFileName.trim() || PASTED_CONTENT_FILE_NAME;
    await this.addUpload(name, content);
    this.updateSnapshot({ pasteFileName: '', pasteContent: '' });
    await this.refreshUploads();
  }

  async deleteUpload(id: string): Promise<void> {
    this.updateSnapshot({ removingUploadId: id });
    try {
      await this.removeUpload(id);
      await this.refreshUploads();
    } finally {
      if (!this.disposed && this.snapshot.removingUploadId === id) {
        this.updateSnapshot({ removingUploadId: null });
      }
    }
  }

  async deleteAllData(): Promise<void> {
    const confirmed = await this.confirmDeleteAllData();
    if (this.disposed || !confirmed) return;

    this.updateSnapshot({ deleteAllPending: true, deleteAllStatus: '' });
    try {
      this.stopSession();
      await this.resetStoredAppData();
      if (this.disposed) return;

      this.onDeleteAllDataReset();
      this.refreshGeneration += 1;
      this.updateSnapshot({
        uploads: [],
        removingUploadId: null,
        pasteFileName: '',
        pasteContent: '',
        deleteAllStatus: 'All local app data was deleted.',
      });
    } catch (e: unknown) {
      if (!this.disposed) {
        this.updateSnapshot({ deleteAllStatus: `Delete failed: ${e instanceof Error ? e.message : String(e)}` });
      }
    } finally {
      if (!this.disposed) this.updateSnapshot({ deleteAllPending: false });
    }
  }

  reset(): void {
    this.refreshGeneration += 1;
    this.replaceSnapshot(createDefaultSnapshot());
  }

  dispose(): void {
    this.disposed = true;
    this.refreshGeneration += 1;
    this.listeners.clear();
  }

  private async refreshUploads(): Promise<void> {
    const generation = ++this.refreshGeneration;
    const uploads = await this.getUploads();
    if (this.disposed || generation !== this.refreshGeneration) return;

    this.updateSnapshot({ uploads });
    this.bumpUploads();
  }

  private updateSnapshot(patch: Partial<FilesSettingsCategorySnapshot>): void {
    this.replaceSnapshot({ ...this.snapshot, ...patch });
  }

  private replaceSnapshot(snapshot: FilesSettingsCategorySnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}

function createDefaultSnapshot(): FilesSettingsCategorySnapshot {
  return {
    uploads: [],
    removingUploadId: null,
    pasteFileName: '',
    pasteContent: '',
    deleteAllPending: false,
    deleteAllStatus: '',
  };
}

function noop(): void {}

function resolveStringUpdate(update: SetStateAction<string>, current: string): string {
  return typeof update === 'function' ? update(current) : update;
}

function pickFilesWithWebInput(): Promise<PickedTextFile[]> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve([]);

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.md,.txt,.json';
    input.onchange = () => {
      const files = Array.from(input.files ?? [], (file) => ({
        name: file.name, text: () => file.text(),
      }));
      input.onchange = null;
      resolve(files);
    };
    input.click();
  });
}

function confirmDeleteAllData(): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(window.confirm(`Delete all local app data?\n\n${DELETE_ALL_MESSAGE}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      'Delete all local app data?',
      DELETE_ALL_MESSAGE,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete All Data', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function createFilesSettingsCategoryController(
  options: FilesSettingsCategoryControllerOptions = {},
): FilesSettingsCategoryController {
  return new DefaultFilesSettingsCategoryController(options);
}

export function useFilesSettingsCategory(options: FilesSettingsCategoryControllerOptions) {
  const controllerRef = useRef<FilesSettingsCategoryController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createFilesSettingsCategoryController(options);
  }
  const controller = controllerRef.current;
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot());

  useEffect(() => controller.subscribe(setSnapshot), [controller]);

  useEffect(() => {
    void controller.load();
    return () => controller.dispose();
  }, [controller]);

  const setPasteFileName = useCallback<Dispatch<SetStateAction<string>>>((update) => {
    controller.setPasteFileName(update);
  }, [controller]);
  const setPasteContent = useCallback<Dispatch<SetStateAction<string>>>((update) => {
    controller.setPasteContent(update);
  }, [controller]);

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
