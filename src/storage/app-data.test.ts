import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());
const storageControls = vi.hoisted(() => ({
  getItemGate: null as Promise<void> | null,
  setItemGate: null as Promise<void> | null,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => {
      await storageControls.getItemGate;
      return storage.get(key) ?? null;
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      await storageControls.setItemGate;
      storage.set(key, value);
    }),
    getAllKeys: vi.fn(async () => Array.from(storage.keys())),
    multiRemove: vi.fn(async (keys: readonly string[]) => {
      keys.forEach((key) => storage.delete(key));
    }),
  },
}));

import {
  APP_STORAGE_KEYS,
  allowAppDataCacheWrites,
  beginAppDataReset,
  canPersistAppDataCache,
  createAppDataWriteToken,
  finishAppDataReset,
  getAppDataItem,
  isAppStorageKey,
  resetAppDataControlsForTests,
  resetStoredAppData,
  setAppDataItem,
} from './app-data';
import {
  CARD_SIZE_KEY,
  COLOR_SCHEME_KEY,
  DATA_SOURCES_KEY,
  SRD_CACHE_KEY_PREFIX,
  UPLOADS_KEY,
} from './keys';
import { STT_SETTINGS_KEY } from '../stt';

describe('app data storage clearing', () => {
  beforeEach(() => {
    resetAppDataControlsForTests();
    storageControls.getItemGate = null;
    storageControls.setItemGate = null;
    storage.clear();
    storage.set(UPLOADS_KEY, '[]');
    storage.set(DATA_SOURCES_KEY, '{}');
    storage.set(`${SRD_CACHE_KEY_PREFIX}wotc-srd`, '{}');
    storage.set(STT_SETTINGS_KEY, '{}');
    storage.set(CARD_SIZE_KEY, 'M');
    storage.set('unrelated:other-app', 'keep');
  });

  it('recognizes app-owned keys only', () => {
    for (const key of APP_STORAGE_KEYS) {
      expect(isAppStorageKey(key)).toBe(true);
    }
    expect(isAppStorageKey('dndref:file-uploads')).toBe(true);
    expect(isAppStorageKey('dndref:srd-wotc-srd')).toBe(true);
    expect(isAppStorageKey('@dnd-ref/stt-settings')).toBe(true);
    expect(isAppStorageKey('unrelated:other-app')).toBe(false);
  });

  it('removes app-owned keys while preserving unrelated storage', async () => {
    const removed = await resetStoredAppData();

    expect(removed.sort()).toEqual([
      '@dnd-ref/card-size',
      '@dnd-ref/stt-settings',
      'dndref:data-sources',
      'dndref:file-uploads',
      'dndref:srd-wotc-srd',
    ]);
    expect(Array.from(storage.keys())).toEqual(['unrelated:other-app']);
  });

  it('keeps the storage key manifest in sync with known fixed keys', () => {
    expect([...APP_STORAGE_KEYS].sort()).toEqual([
      CARD_SIZE_KEY,
      COLOR_SCHEME_KEY,
      DATA_SOURCES_KEY,
      STT_SETTINGS_KEY,
      UPLOADS_KEY,
    ].sort());
  });

  it('invalidates stale async write tokens after a reset starts', () => {
    const token = createAppDataWriteToken();
    const generation = beginAppDataReset();

    expect(token).not.toBe(createAppDataWriteToken());
    expect(canPersistAppDataCache(token)).toBe(false);

    finishAppDataReset(generation);
    expect(canPersistAppDataCache(token)).toBe(false);
  });

  it('blocks cache writes for the reset generation until explicitly allowed', async () => {
    await resetStoredAppData();
    const token = createAppDataWriteToken();

    expect(canPersistAppDataCache(token)).toBe(false);

    allowAppDataCacheWrites();
    expect(canPersistAppDataCache(token)).toBe(true);
  });

  it('waits for in-flight settings writes before clearing storage', async () => {
    let releaseSetItem!: () => void;
    storageControls.setItemGate = new Promise((resolve) => {
      releaseSetItem = resolve;
    });

    const write = setAppDataItem(DATA_SOURCES_KEY, '{"aiApiKey":"secret"}');
    await Promise.resolve();

    const reset = resetStoredAppData();
    releaseSetItem();

    await Promise.all([write, reset]);

    expect(storage.get(DATA_SOURCES_KEY)).toBeUndefined();
    expect(storage.get('unrelated:other-app')).toBe('keep');
  });

  it('ignores stale hydration reads that resolve after reset starts', async () => {
    let releaseGetItem!: () => void;
    storageControls.getItemGate = new Promise((resolve) => {
      releaseGetItem = resolve;
    });

    const read = getAppDataItem(STT_SETTINGS_KEY);
    await Promise.resolve();

    const generation = beginAppDataReset();
    finishAppDataReset(generation);
    releaseGetItem();

    expect(await read).toBeNull();
  });
});
