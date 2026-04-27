import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  createDefaultDataSourceSettings,
  loadDataSourceSettings,
  mergeDataSourceSettings,
  saveDataSourceSettings,
  type DataSourcesSettings,
} from '../storage/app-data';

export { DATA_SOURCES_KEY } from '../storage/keys';
export {
  DEFAULT_DATA_SOURCES_SETTINGS,
  createDefaultDataSourceSettings,
  type DataSourcesSettings,
} from '../storage/app-data';

interface DataSourcesContextType {
  settings: DataSourcesSettings;
  uploadsVersion: number;
  update: (patch: Partial<DataSourcesSettings>) => Promise<void>;
  bumpUploads: () => void;
  reset: () => void;
}

const DataSourcesContext = createContext<DataSourcesContextType | null>(null);

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

    return () => {
      mounted = false;
    };
  }, [replaceSettings]);

  const update = useCallback(async (patch: Partial<DataSourcesSettings>) => {
    const nextSettings = mergeDataSourceSettings({ ...latestSettings.current, ...patch });
    replaceSettings(nextSettings);
    await saveDataSourceSettings(nextSettings);
  }, [replaceSettings]);

  const bumpUploads = useCallback(() => {
    setUploadsVersion((v) => v + 1);
  }, []);

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
  if (!ctx) throw new Error('useDataSources must be used within DataSourcesProvider');
  return ctx;
}
