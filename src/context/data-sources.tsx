import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const DATA_SOURCES_KEY = 'dndref:data-sources';

export interface DataSourcesSettings {
  srdEnabled: boolean;
  kankaToken: string;
  kankaCampaignId: string;
  homebreweryUrl: string;
  notionToken: string;
  notionPageIds: string;
  googleDocsUrl: string;
  aiApiKey: string;
}

const DEFAULT: DataSourcesSettings = {
  srdEnabled: true,
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
}

const DataSourcesContext = createContext<DataSourcesContextType | null>(null);

export function DataSourcesProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DataSourcesSettings>(DEFAULT);
  const [uploadsVersion, setUploadsVersion] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(DATA_SOURCES_KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULT, ...(JSON.parse(raw) as Partial<DataSourcesSettings>) });
      })
      .catch((e) => console.warn('[dnd-ref] Failed to load data source settings:', e));
  }, []);

  async function update(patch: Partial<DataSourcesSettings>) {
    let next!: DataSourcesSettings;
    setSettings((prev) => {
      next = { ...prev, ...patch };
      return next;
    });
    await AsyncStorage.setItem(DATA_SOURCES_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('[dnd-ref] Failed to save data source settings:', e),
    );
  }

  const bumpUploads = useCallback(() => {
    setUploadsVersion((v) => v + 1);
  }, []);

  return (
    <DataSourcesContext.Provider value={{ settings, uploadsVersion, update, bumpUploads }}>
      {children}
    </DataSourcesContext.Provider>
  );
}

export function useDataSources() {
  const ctx = useContext(DataSourcesContext);
  if (!ctx) throw new Error('useDataSources must be used within DataSourcesProvider');
  return ctx;
}
