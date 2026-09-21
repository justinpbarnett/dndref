import { useCallback, useEffect, useRef, useState } from "react";

import { useDataSources } from "../context/data-sources/provider";
import { useSession } from "../context/session";
import { useUISettings } from "../context/ui-settings";
import { parseWithAI } from "../entities/ai-parser";
import { getErrorMessage } from "../utils/error-message";
import { openAppData } from "../storage/app-data";
import { createDefaultDataSourceSettings, type DataSourcesSettings } from "../storage/settings";
import type { Category } from "./constants";
import { useFilesSettingsCategory } from "./files-settings-category";
import { useVoiceSettingsCategory } from "./voice-settings-category";

export function useSettingsScreenController() {
  const [category, setCategory] = useState<Category>("display");
  const [dataSaved, setDataSaved] = useState(false);
  const uiSettings = useUISettings();
  const { settings: ds, update: updateDs, bumpUploads, reset: resetDataSources } = useDataSources();
  const { stop: stopSession } = useSession();
  const voiceCategory = useVoiceSettingsCategory();
  const [dsLocal, setDsLocal] = useState<DataSourcesSettings>(ds);
  const dataSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aiContent, setAiContent] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiResult, setAiResult] = useState("");

  const resetAfterDeleteAll = useCallback(() => {
    resetDataSources();
    uiSettings.resetUISettings();
    voiceCategory.resetVoiceSettings();
    setDsLocal(createDefaultDataSourceSettings());
    setAiContent("");
    setAiResult("");
    setDataSaved(false);
  }, [resetDataSources, uiSettings, voiceCategory]);

  const filesCategory = useFilesSettingsCategory({
    bumpUploads,
    stopSession,
    onDeleteAllDataReset: resetAfterDeleteAll,
  });

  useEffect(() => () => void (dataSavedTimer.current && clearTimeout(dataSavedTimer.current)), []);

  useEffect(() => setDsLocal(ds), [ds]);

  const saveData = async () => {
    await updateDs(dsLocal);
    setDataSaved(true);
    if (dataSavedTimer.current) clearTimeout(dataSavedTimer.current);
    dataSavedTimer.current = setTimeout(() => setDataSaved(false), 2000);
  };

  const handleAIParse = async () => {
    if (!aiContent.trim() || !dsLocal.aiApiKey) return;
    const appData = openAppData();
    setAiParsing(true);
    setAiResult("");
    try {
      const entities = await parseWithAI(aiContent, dsLocal.aiApiKey);
      if (!appData.isCurrent()) return;
      const name = `AI Parsed ${new Date().toLocaleDateString()}.json`;
      await filesCategory.saveUpload(name, JSON.stringify(entities));
      if (!appData.isCurrent()) return;
      setAiResult(`Found ${entities.length} entities. Saved as "${name}".`);
      setAiContent("");
    } catch (e: unknown) {
      setAiResult(`Error: ${getErrorMessage(e)}`);
    } finally {
      setAiParsing(false);
    }
  };

  // One slice per settings category, so the view passes a slice to its section
  // instead of threading every field through the tree.
  return {
    category,
    setCategory,
    display: uiSettings,
    voice: voiceCategory,
    data: { dsLocal, setDsLocal, saveData, dataSaved },
    files: filesCategory,
    ai: { dsLocal, setDsLocal, aiContent, setAiContent, aiParsing, aiResult, handleAIParse },
  };
}
