import type { UploadedFile } from "../../entities/providers/file-upload";

export type FilesSettingsCategorySnapshot = {
  uploads: UploadedFile[];
  removingUploadId: string | null;
  deleteAllPending: boolean;
} & Record<"pasteFileName" | "pasteContent" | "deleteAllStatus", string>;
