import AsyncStorage from "@react-native-async-storage/async-storage";

import { STT_SETTINGS_KEY } from "../stt/index";
import { AsyncOperationQueue } from "../utils/async-operation-queue";
import { CARD_SIZE_KEY, COLOR_SCHEME_KEY, DATA_SOURCES_KEY, SRD_CACHE_KEY_PREFIX, UPLOADS_KEY } from "./keys";

export const APP_STORAGE_KEYS = [DATA_SOURCES_KEY, UPLOADS_KEY, STT_SETTINGS_KEY, CARD_SIZE_KEY, COLOR_SCHEME_KEY];

const APP_STORAGE_KEY_PREFIXES = ["dndref:", "@dnd-ref/"];

export const isAppStorageKey = (key: string): boolean =>
  APP_STORAGE_KEYS.includes(key) ||
  key.startsWith(SRD_CACHE_KEY_PREFIX) ||
  APP_STORAGE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));

/**
 * A view of local app data taken at one moment.
 *
 * "Delete all data" wipes storage while other code is mid-await. A session
 * remembers the state of the world when the caller opened it, so work that
 * started before a wipe cannot write after it. Open one at the top of an
 * operation, then use it for every read and write in that operation.
 *
 * - `read` resolves to null once a wipe has happened, however old the value is.
 * - `write` and `mutate` resolve false when the session is stale. They never
 *   throw for that reason.
 * - `cache` is for data the app can refetch. A wipe blocks it until a real
 *   user write proves the person is using the app again, so a slow fetch in
 *   flight during the wipe cannot repopulate what they deleted.
 * - `mutate` reads and writes one key as a single step. Concurrent mutations
 *   of the same key do not lose updates.
 * - `isCurrent` answers whether a wipe has happened since the session opened.
 *   Use it before showing the results of long work.
 */
export type AppDataSession = {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<boolean>;
  cache(key: string, value: string): Promise<boolean>;
  mutate(key: string, change: (raw: string | null) => string): Promise<boolean>;
  isCurrent(): boolean;
};

const STALE = -1;

const writes = new AsyncOperationQueue();
let generation = 0;
let wiping = false;
let cacheBlockedFor: number | null = null;

const currentGeneration = (): number => (wiping ? STALE : generation);
const isCurrent = (token: number): boolean => token !== STALE && token === generation && !wiping;
const canCache = (token: number): boolean => isCurrent(token) && cacheBlockedFor !== token;

/** Opens a session bound to the state of app data right now. */
export function openAppData(): AppDataSession {
  const token = currentGeneration();

  const persist = async (key: string, value: string, cache: boolean): Promise<boolean> => {
    const allowed = cache ? canCache : isCurrent;
    if (!allowed(token)) return false;

    await AsyncStorage.setItem(key, value);
    const saved = allowed(token);
    // A real user write means the app is in use again, so caching may resume.
    if (saved && !cache) cacheBlockedFor = null;
    return saved;
  };

  const read = async (key: string): Promise<string | null> => {
    const value = await AsyncStorage.getItem(key);
    return isCurrent(token) ? value : null;
  };

  return {
    read,
    isCurrent: () => isCurrent(token),
    write: (key, value) => writes.run(() => persist(key, value, false)),
    cache: (key, value) => writes.run(() => persist(key, value, true)),
    mutate: (key, change) =>
      writes.run(async () => {
        if (!isCurrent(token)) return false;
        const raw = await read(key);
        if (!isCurrent(token)) return false;
        return persist(key, change(raw), false);
      }),
  };
}

/**
 * Removes every key this app owns and leaves other apps' keys alone.
 *
 * Writes already in flight are drained first and then dropped, so nothing
 * lands after the wipe. `beforeClear` runs inside that window for callers with
 * their own state to tear down. Resolves to the keys that were removed.
 */
export async function resetStoredAppData(options: { beforeClear?: () => Promise<void> } = {}): Promise<string[]> {
  generation += 1;
  wiping = true;
  const wipe = generation;
  try {
    await options.beforeClear?.();
    await writes.wait();
    const storedKeys = await AsyncStorage.getAllKeys();
    const keys = Array.from(new Set(storedKeys.filter(isAppStorageKey)));
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
    return keys;
  } finally {
    if (wipe === generation) {
      wiping = false;
      cacheBlockedFor = wipe;
    }
  }
}

/** Clears the module-level session state between test cases. */
export function resetAppDataForTests(): void {
  generation = 0;
  wiping = false;
  cacheBlockedFor = null;
  writes.reset();
}
