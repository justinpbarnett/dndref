import { UPLOADS_KEY } from './keys';
import {
  canPersistAppData,
  createAppDataWriteToken,
  getAppDataItem,
  setAppDataItem,
} from './app-data-core';

export interface UploadedFile {
  id: string;
  name: string;
  content: string;
}

let uploadMutationQueue: Promise<unknown> = Promise.resolve();

export async function getUploadedFiles(): Promise<UploadedFile[]> {
  return readUploadedFiles(createAppDataWriteToken());
}

export async function addUploadedFile(name: string, content: string): Promise<boolean> {
  return mutateUploadedFiles((uploads) => [...uploads, createUploadedFile(name, content)]);
}

export async function removeUploadedFile(id: string): Promise<boolean> {
  return mutateUploadedFiles((uploads) => uploads.filter((u) => u.id !== id));
}

export async function waitForUploadedFileMutations(): Promise<void> {
  await uploadMutationQueue.catch(() => undefined);
}

function createUploadedFile(name: string, content: string): UploadedFile {
  return {
    id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    content,
  };
}

function isUploadedFile(value: unknown): value is UploadedFile {
  if (!value || typeof value !== 'object') return false;

  const file = value as Record<string, unknown>;
  return typeof file.id === 'string' &&
    typeof file.name === 'string' &&
    typeof file.content === 'string';
}

async function readUploadedFiles(token: number): Promise<UploadedFile[]> {
  try {
    const raw = await getAppDataItem(UPLOADS_KEY, token);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isUploadedFile) : [];
  } catch (e) {
    console.warn('[dnd-ref] Failed to read uploads from storage:', e);
    return [];
  }
}

function mutateUploadedFiles(mutator: (uploads: UploadedFile[]) => UploadedFile[]): Promise<boolean> {
  const token = createAppDataWriteToken();
  const operation = uploadMutationQueue
    .catch(() => undefined)
    .then(async () => {
      if (!canPersistAppData(token)) return false;
      const currentUploads = await readUploadedFiles(token);
      if (!canPersistAppData(token)) return false;

      const nextUploads = mutator(currentUploads);
      return setAppDataItem(UPLOADS_KEY, JSON.stringify(nextUploads), { token });
    });

  uploadMutationQueue = operation.catch(() => undefined);
  return operation;
}

export function resetUploadedFileMutationQueueForTests(): void {
  uploadMutationQueue = Promise.resolve();
}
