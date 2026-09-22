import { openAppData } from "./app-data";
import { DATA_SOURCES_KEY } from "./keys";
import { DEFAULT_RULESET_ID, isRulesetId, type RulesetId } from "../rulesets/id";
import { DEFAULT_STT_SETTINGS, STT_SETTINGS_KEY, type STTSettings } from "../stt/index";

export type DataSourcesSettings = {
  /** Which game the table is playing. It decides both the world and the matcher. */
  rulesetId: RulesetId;
  srdEnabled: boolean;
  srdSources: string[];
} & Record<
  "kankaToken" | "kankaCampaignId" | "homebreweryUrl" | "notionToken" | "notionPageIds" | "googleDocsUrl" | "aiApiKey",
  string
>;

export const DEFAULT_DATA_SOURCES_SETTINGS: DataSourcesSettings = {
  rulesetId: DEFAULT_RULESET_ID,
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
  // A stored id from a build that knew another game must not leave the session
  // with a ruleset nothing can load.
  const rulesetId = isRulesetId(patch.rulesetId) ? patch.rulesetId : defaultSettings.rulesetId;

  return { ...defaultSettings, ...patch, rulesetId, srdSources };
}

type VoiceSettingsPatch = Partial<Record<keyof STTSettings, unknown>>;

export const createDefaultVoiceSettings = (): STTSettings => ({ ...DEFAULT_STT_SETTINGS });

function normalizeVoiceSettings(settings: unknown): STTSettings {
  const patch = settings !== null && typeof settings === "object" ? (settings as VoiceSettingsPatch) : {};
  const defaultSettings = createDefaultVoiceSettings();

  const provider =
    patch.provider === "deepgram" || patch.provider === "web-speech" ? patch.provider : defaultSettings.provider;
  const deepgramApiKey =
    typeof patch.deepgramApiKey === "string" ? patch.deepgramApiKey : defaultSettings.deepgramApiKey;

  return { provider, deepgramApiKey };
}

export const mergeVoiceSettings: (settings?: Partial<STTSettings> | null) => STTSettings = normalizeVoiceSettings;

export const loadVoiceSettings = (): Promise<STTSettings | null> =>
  loadJsonSetting(STT_SETTINGS_KEY, normalizeVoiceSettings, "voice settings");

export const saveVoiceSettings = (settings: STTSettings): Promise<boolean> =>
  saveJsonSetting(STT_SETTINGS_KEY, mergeVoiceSettings(settings), "voice settings");

export const loadDataSourceSettings = (): Promise<DataSourcesSettings | null> =>
  loadJsonSetting(
    DATA_SOURCES_KEY,
    (value) => mergeDataSourceSettings(value as Partial<DataSourcesSettings>),
    "data source settings",
  );

export const saveDataSourceSettings = (settings: DataSourcesSettings): Promise<boolean> =>
  saveJsonSetting(DATA_SOURCES_KEY, settings, "data source settings");

async function loadJsonSetting<T>(key: string, normalize: (value: unknown) => T, label: string): Promise<T | null> {
  let raw: string | null;
  try {
    raw = await openAppData().read(key);
  } catch (e) {
    console.warn(`[dnd-ref] Failed to load ${label}:`, e);
    return null;
  }

  if (!raw) return null;

  try {
    return normalize(JSON.parse(raw));
  } catch (e) {
    console.warn(`[dnd-ref] Failed to parse ${label}:`, e);
    return null;
  }
}

async function saveJsonSetting(key: string, value: unknown, label: string): Promise<boolean> {
  try {
    return await openAppData().write(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[dnd-ref] Failed to save ${label}:`, e);
    return false;
  }
}
