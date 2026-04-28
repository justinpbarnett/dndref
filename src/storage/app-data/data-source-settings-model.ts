export type DataSourcesSettings = {
  srdEnabled: boolean;
  srdSources: string[];
} & Record<
  "kankaToken" | "kankaCampaignId" | "homebreweryUrl" | "notionToken" | "notionPageIds" | "googleDocsUrl" | "aiApiKey",
  string
>;

export const DEFAULT_DATA_SOURCES_SETTINGS: DataSourcesSettings = {
  srdEnabled: true,
  srdSources: ["wotc-srd"],
  kankaToken: "",
  kankaCampaignId: "",
  homebreweryUrl: "",
  notionToken: "",
  notionPageIds: "",
  googleDocsUrl: "",
  aiApiKey: "",
};

export const createDefaultDataSourceSettings = (): DataSourcesSettings => ({
  ...DEFAULT_DATA_SOURCES_SETTINGS,
  srdSources: [...DEFAULT_DATA_SOURCES_SETTINGS.srdSources],
});

export function mergeDataSourceSettings(settings?: Partial<DataSourcesSettings> | null): DataSourcesSettings {
  const patch = settings ?? {};
  const defaultSettings = createDefaultDataSourceSettings();
  const srdSources = Array.isArray(patch.srdSources) ? [...patch.srdSources] : defaultSettings.srdSources;

  return { ...defaultSettings, ...patch, srdSources };
}
