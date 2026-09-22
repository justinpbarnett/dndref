import { getUploadedFiles } from "../../storage/uploads";
import { EntityIndex, WorldDataProvider } from "../index";
import { ingestUploadedFile } from "../ingestion";

export class FileUploadProvider implements WorldDataProvider {
  readonly name = "Uploaded Files";

  async load(): Promise<EntityIndex> {
    const uploads = await getUploadedFiles();
    return uploads.flatMap((upload) =>
      ingestUploadedFile(upload, {
        onJsonParseError: () => {
          console.warn(`[dnd-ref] Failed to parse JSON upload: ${upload.name}`);
        },
      }),
    );
  }
}
