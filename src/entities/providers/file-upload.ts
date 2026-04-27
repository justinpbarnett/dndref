import {
  addUploadedFile,
  getUploadedFiles,
  removeUploadedFile,
  waitForUploadedFileMutations,
  type UploadedFile,
} from '../../storage/app-data';
import { EntityIndex, WorldDataProvider } from '../index';
import { ingestUploadedFile } from '../ingestion';

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
  return ingestUploadedFile(upload, {
    onJsonParseError: () => {
      console.warn(`[dnd-ref] Failed to parse JSON upload: ${upload.name}`);
    },
  });
}
