import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import {
  createDefaultDataSourceSettings,
  mergeDataSourceSettings,
  type DataSourcesSettings,
} from "../../storage/app-data/data-source-settings-model";
import { DATA_SOURCES_KEY } from "../../storage/keys";
import { appDataStorage } from "../data-sources";

export { createDefaultDataSourceSettings, type DataSourcesSettings } from "../../storage/app-data/data-source-settings-model";

type DataSourcesContextType = {
  settings: DataSourcesSettings;
  uploadsVersion: number;
  update: (patch: Partial<DataSourcesSettings>) => Promise<void>;
} & Record<"bumpUploads" | "reset", () => void>;

const DataSourcesContext = createContext<DataSourcesContextType | null>(null);

async function loadDataSourceSettings(): Promise<DataSourcesSettings | null> {
  try {
    const raw = await appDataStorage.getItem(DATA_SOURCES_KEY);
    return raw ? mergeDataSourceSettings(JSON.parse(raw) as Partial<DataSourcesSettings>) : null;
  } catch (e) {
    console.warn("[dnd-ref] Failed to load data source settings:", e);
    return null;
  }
}

async function saveDataSourceSettings(settings: DataSourcesSettings): Promise<void> {
  try {
    await appDataStorage.setItem(DATA_SOURCES_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("[dnd-ref] Failed to save data source settings:", e);
  }
}

export function DataSourcesProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DataSourcesSettings>(() => createDefaultDataSourceSettings());
  const latestSettings = useRef(settings);
  const [uploadsVersion, setUploadsVersion] = useState(0);

  const replaceSettings = useCallback((nextSettings: DataSourcesSettings) => {
    latestSettings.current = nextSettings;
    setSettings(nextSettings);
  }, []);

  useEffect(() => {
    let mounted = true;

    loadDataSourceSettings().then((loadedSettings) => {
      if (!mounted || !loadedSettings) return;
      replaceSettings(loadedSettings);
    });

    return () => void (mounted = false);
  }, [replaceSettings]);

  const update = useCallback(
    async (patch: Partial<DataSourcesSettings>) => {
      const nextSettings = mergeDataSourceSettings({ ...latestSettings.current, ...patch });
      replaceSettings(nextSettings);
      await saveDataSourceSettings(nextSettings);
    },
    [replaceSettings],
  );

  const bumpUploads = useCallback(() => setUploadsVersion((v) => v + 1), []);

  const reset = useCallback(() => {
    replaceSettings(createDefaultDataSourceSettings());
    setUploadsVersion((v) => v + 1);
  }, [replaceSettings]);

  return (
    <DataSourcesContext.Provider value={{ settings, uploadsVersion, update, bumpUploads, reset }}>
      {children}
    </DataSourcesContext.Provider>
  );
}

export function useDataSources() {
  const ctx = useContext(DataSourcesContext);
  if (!ctx) throw new Error("useDataSources must be used within DataSourcesProvider");
  return ctx;
}
