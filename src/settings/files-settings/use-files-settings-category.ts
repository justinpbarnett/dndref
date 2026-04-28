import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import {
  createFilesSettingsCategoryController,
  type FilesSettingsCategoryController,
  type FilesSettingsCategoryControllerOptions,
} from "./files-settings-category-controller-impl";

export function useFilesSettingsCategory(options: FilesSettingsCategoryControllerOptions) {
  const controllerRef = useRef<FilesSettingsCategoryController | null>(null);
  if (!controllerRef.current) controllerRef.current = createFilesSettingsCategoryController(options);
  const controller = controllerRef.current;
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot());

  useEffect(() => controller.subscribe(setSnapshot), [controller]);

  useEffect(() => {
    void controller.load();
    return () => controller.dispose();
  }, [controller]);

  const setPasteFileName = useCallback<Dispatch<SetStateAction<string>>>(
    (update) => controller.setPasteFileName(update),
    [controller],
  );
  const setPasteContent = useCallback<Dispatch<SetStateAction<string>>>(
    (update) => controller.setPasteContent(update),
    [controller],
  );

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
