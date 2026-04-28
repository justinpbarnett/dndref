import { addUploadedFile, getUploadedFiles, removeUploadedFile, type UploadedFile } from "../../storage/app-data";
import { EntityIndex, WorldDataProvider } from "../index";
import { ingestUploadedFile } from "../ingestion";

export type { UploadedFile } from "../../storage/app-data";

export const getUploads = getUploadedFiles;
export const addUpload = addUploadedFile;
export const removeUpload = removeUploadedFile;

export class FileUploadProvider implements WorldDataProvider {
  readonly name = "Uploaded Files";

  async load(): Promise<EntityIndex> {
    const uploads = await getUploads();
    return uploads.flatMap((upload) =>
      ingestUploadedFile(upload, {
        onJsonParseError: () => {
          console.warn(`[dnd-ref] Failed to parse JSON upload: ${upload.name}`);
        },
      }),
    );
  }
}
