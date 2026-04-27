import {
  addUploadedFile,
  getUploadedFiles,
  removeUploadedFile,
  waitForUploadedFileMutations,
  type UploadedFile,
} from '../../storage/app-data';
import { EntityIndex, WorldDataProvider, normalizeEntityType, slugify } from '../index';
import { MarkdownProvider } from './markdown';

export { UPLOADS_KEY } from '../../storage/keys';
export type { UploadedFile } from '../../storage/app-data';

export async function getUploads(): Promise<UploadedFile[]> {
  return getUploadedFiles();
}

export async function addUpload(name: string, content: string): Promise<void> {
  await addUploadedFile(name, content);
}

export async function removeUpload(id: string): Promise<void> {
  await removeUploadedFile(id);
}

export async function waitForUploadMutations(): Promise<void> {
  await waitForUploadedFileMutations();
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
