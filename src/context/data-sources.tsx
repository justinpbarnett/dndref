import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  createDefaultDataSourceSettings,
  loadDataSourceSettings,
  mergeDataSourceSettings,
  saveDataSourceSettings,
} from '../storage/app-data';
import type { DataSourcesSettings } from '../storage/app-data';

export { DATA_SOURCES_KEY } from '../storage/keys';
export { DEFAULT_DATA_SOURCES_SETTINGS, type DataSourcesSettings } from '../storage/app-data';

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
  const [uploadsVersion, setUploadsVersion] = useState(0);

  useEffect(() => {
    let mounted = true;
    loadDataSourceSettings().then((loaded) => {
      if (mounted && loaded) setSettings(loaded);
    });
    return () => { mounted = false; };
  }, []);

  async function update(patch: Partial<DataSourcesSettings>) {
    let next!: DataSourcesSettings;
    setSettings((prev) => {
      next = mergeDataSourceSettings({ ...prev, ...patch });
      return next;
    });
    await saveDataSourceSettings(next);
  }

  const bumpUploads = useCallback(() => {
    setUploadsVersion((v) => v + 1);
  }, []);

  const reset = useCallback(() => {
    setSettings(createDefaultDataSourceSettings());
    setUploadsVersion((v) => v + 1);
  }, []);

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
