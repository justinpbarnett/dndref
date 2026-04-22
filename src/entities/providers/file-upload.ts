import AsyncStorage from '@react-native-async-storage/async-storage';
import { EntityIndex, WorldDataProvider, normalizeEntityType, slugify } from '../index';
import { MarkdownProvider } from './markdown';

const UPLOADS_KEY = 'dndref:file-uploads';
let uploadMutationQueue: Promise<void> = Promise.resolve();

export interface UploadedFile {
  id: string;
  name: string;
  content: string;
}

export async function getUploads(): Promise<UploadedFile[]> {
  try {
    const raw = await AsyncStorage.getItem(UPLOADS_KEY);
    return raw ? (JSON.parse(raw) as UploadedFile[]) : [];
  } catch (e) {
    console.warn('[dnd-ref] Failed to read uploads from storage:', e);
    return [];
  }
}

export async function addUpload(name: string, content: string): Promise<void> {
  await mutateUploads((uploads) => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return [...uploads, { id, name, content }];
  });
}

export async function removeUpload(id: string): Promise<void> {
  await mutateUploads((uploads) => uploads.filter((u) => u.id !== id));
}

function mutateUploads(mutator: (uploads: UploadedFile[]) => UploadedFile[]): Promise<void> {
  const operation = uploadMutationQueue
    .catch(() => undefined)
    .then(async () => {
      const uploads = await getUploads();
      await AsyncStorage.setItem(UPLOADS_KEY, JSON.stringify(mutator(uploads)));
    });

  uploadMutationQueue = operation.catch(() => undefined);
  return operation;
}

export class FileUploadProvider implements WorldDataProvider {
  readonly name = 'Uploaded Files';

  async load(): Promise<EntityIndex> {
    const uploads = await getUploads();
    const results = await Promise.all(uploads.map(parseUpload));
    return results.flat();
  }

  getName(): string { return this.name; }
}

async function parseUpload(upload: UploadedFile): Promise<EntityIndex> {
  if (upload.name.endsWith('.json')) {
    try {
      return parseJSON(upload.content);
    } catch {
      console.warn(`[dnd-ref] Failed to parse JSON upload: ${upload.name}`);
    }
  }
  return new MarkdownProvider(upload.content, upload.name).load();
}

function parseJSON(content: string): EntityIndex {
  const data = JSON.parse(content) as unknown;
  const items = Array.isArray(data) ? data : [];
  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof (item as any).name === 'string')
    .map((item, i) => ({
      id: `upload-${slugify(item.name as string)}-${Date.now()}-${i}`,
      name: item.name as string,
      type: normalizeEntityType((item.type as string) ?? ''),
      aliases: Array.isArray(item.aliases) ? (item.aliases as string[]) : [],
      summary: ((item.summary ?? item.description ?? '') as string),
    }));
}
