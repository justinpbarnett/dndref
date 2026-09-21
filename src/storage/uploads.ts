import { openAppData } from "./app-data";
import { UPLOADS_KEY } from "./keys";

export type UploadedFile = { id: string; name: string; content: string };

export async function getUploadedFiles(): Promise<UploadedFile[]> {
  try {
    return parseUploadedFiles(await openAppData().read(UPLOADS_KEY));
  } catch (e) {
    console.warn("[dnd-ref] Failed to read uploads from storage:", e);
    return [];
  }
}

export const addUploadedFile = (name: string, content: string): Promise<boolean> =>
  mutateUploadedFiles((uploads) => [
    ...uploads,
    { id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, content },
  ]);

export const removeUploadedFile = (id: string): Promise<boolean> =>
  mutateUploadedFiles((uploads) => uploads.filter((u) => u.id !== id));

function isUploadedFile(value: unknown): value is UploadedFile {
  if (!value || typeof value !== "object") return false;

  const file = value as Record<keyof UploadedFile, unknown>;
  return (["id", "name", "content"] as const).every((key) => typeof file[key] === "string");
}

function parseUploadedFiles(raw: string | null): UploadedFile[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isUploadedFile) : [];
  } catch (e) {
    console.warn("[dnd-ref] Failed to parse uploads from storage:", e);
    return [];
  }
}

const mutateUploadedFiles = (mutator: (uploads: UploadedFile[]) => UploadedFile[]): Promise<boolean> =>
  openAppData().mutate(UPLOADS_KEY, (raw) => JSON.stringify(mutator(parseUploadedFiles(raw))));
