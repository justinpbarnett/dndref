import { createAppDataWriteToken, getAppDataItem, isAppDataWriteTokenCurrent, setAppDataItem } from "./app-data-core";
import { UPLOADS_KEY } from "./keys";

export type UploadedFile = { id: string; name: string; content: string };

let uploadMutationQueue: Promise<unknown> = Promise.resolve();

export const getUploadedFiles = (): Promise<UploadedFile[]> => readUploadedFiles(createAppDataWriteToken());
export const addUploadedFile = (name: string, content: string): Promise<boolean> =>
  mutateUploadedFiles((uploads) => [
    ...uploads,
    { id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, content },
  ]);
export const removeUploadedFile = (id: string): Promise<boolean> =>
  mutateUploadedFiles((uploads) => uploads.filter((u) => u.id !== id));
export async function waitForUploadedFileMutations(): Promise<void> {
  await uploadMutationQueue.catch(() => undefined);
}

function isUploadedFile(value: unknown): value is UploadedFile {
  if (!value || typeof value !== "object") return false;

  const file = value as Record<keyof UploadedFile, unknown>;
  return (["id", "name", "content"] as const).every((key) => typeof file[key] === "string");
}

async function readUploadedFiles(token: number): Promise<UploadedFile[]> {
  try {
    const raw = await getAppDataItem(UPLOADS_KEY, token);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isUploadedFile) : [];
  } catch (e) {
    console.warn("[dnd-ref] Failed to read uploads from storage:", e);
    return [];
  }
}

function mutateUploadedFiles(mutator: (uploads: UploadedFile[]) => UploadedFile[]): Promise<boolean> {
  const token = createAppDataWriteToken();
  const operation = uploadMutationQueue
    .catch(() => undefined)
    .then(async () => {
      if (!isAppDataWriteTokenCurrent(token)) return false;
      const currentUploads = await readUploadedFiles(token);
      if (!isAppDataWriteTokenCurrent(token)) return false;

      const nextUploads = mutator(currentUploads);
      return setAppDataItem(UPLOADS_KEY, JSON.stringify(nextUploads), { token });
    });

  uploadMutationQueue = operation.catch(() => undefined);
  return operation;
}

export function resetUploadedFileMutationQueueForTests(): void {
  uploadMutationQueue = Promise.resolve();
}
