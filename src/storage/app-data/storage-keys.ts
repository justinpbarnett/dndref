import { STT_SETTINGS_KEY } from "../../stt/index";
import { CARD_SIZE_KEY, COLOR_SCHEME_KEY, DATA_SOURCES_KEY, SRD_CACHE_KEY_PREFIX, UPLOADS_KEY } from "../keys";

export const APP_STORAGE_KEYS = [DATA_SOURCES_KEY, UPLOADS_KEY, STT_SETTINGS_KEY, CARD_SIZE_KEY, COLOR_SCHEME_KEY];

const APP_STORAGE_KEY_PREFIXES = ["dndref:", "@dnd-ref/"];

export const isAppStorageKey = (key: string): boolean =>
  APP_STORAGE_KEYS.includes(key) ||
  key.startsWith(SRD_CACHE_KEY_PREFIX) ||
  APP_STORAGE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
