import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  allowAppDataCacheWrites,
  createAppDataWriteToken,
  getAppDataItem,
  isAppDataWriteTokenCurrent,
  setAppDataItem,
} from '../storage/app-data';
import { DATA_SOURCES_KEY } from '../storage/keys';

export { DATA_SOURCES_KEY } from '../storage/keys';

export interface DataSourcesSettings {
  srdEnabled: boolean;
  srdSources: string[];
  kankaToken: string;
  kankaCampaignId: string;
  homebreweryUrl: string;
  notionToken: string;
  notionPageIds: string;
  googleDocsUrl: string;
  aiApiKey: string;
}

export const DEFAULT_DATA_SOURCES_SETTINGS: DataSourcesSettings = {
  srdEnabled: true,
  srdSources: ['wotc-srd'],
  kankaToken: '',
  kankaCampaignId: '',
  homebreweryUrl: '',
  notionToken: '',
  notionPageIds: '',
  googleDocsUrl: '',
  aiApiKey: '',
};

interface DataSourcesContextType {
  settings: DataSourcesSettings;
  uploadsVersion: number;
  update: (patch: Partial<DataSourcesSettings>) => Promise<void>;
  bumpUploads: () => void;
  reset: () => void;
}

const DataSourcesContext = createContext<DataSourcesContextType | null>(null);

export function DataSourcesProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DataSourcesSettings>(DEFAULT_DATA_SOURCES_SETTINGS);
  const [uploadsVersion, setUploadsVersion] = useState(0);

  useEffect(() => {
    const token = createAppDataWriteToken();
    getAppDataItem(DATA_SOURCES_KEY, token)
      .then((raw) => {
        if (raw) {
          try {
            setSettings({ ...DEFAULT_DATA_SOURCES_SETTINGS, ...(JSON.parse(raw) as Partial<DataSourcesSettings>) });
          } catch (parseErr) {
            console.warn('[dnd-ref] Failed to parse data source settings:', parseErr);
          }
        }
      })
      .catch((e) => console.warn('[dnd-ref] Failed to load data source settings:', e));
  }, []);

  async function update(patch: Partial<DataSourcesSettings>) {
    const token = createAppDataWriteToken();
    if (!isAppDataWriteTokenCurrent(token)) return;
    let next!: DataSourcesSettings;
    setSettings((prev) => {
      next = { ...prev, ...patch };
      return next;
    });
    const saved = await setAppDataItem(DATA_SOURCES_KEY, JSON.stringify(next), { token }).catch((e) => {
      console.warn('[dnd-ref] Failed to save data source settings:', e);
      return false;
    });
    if (saved) allowAppDataCacheWrites();
  }

  const bumpUploads = useCallback(() => {
    setUploadsVersion((v) => v + 1);
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_DATA_SOURCES_SETTINGS);
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
