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
  DEFAULT_DATA_SOURCES_SETTINGS,
  allowAppDataCacheWrites,
  beginAppDataReset,
  canPersistAppDataCache,
  createAppDataWriteToken,
  finishAppDataReset,
  getAppDataItem,
  isAppStorageKey,
  loadDataSourceSettings,
  loadVoiceSettings,
  resetAppDataControlsForTests,
  resetStoredAppData,
  saveDataSourceSettings,
  saveVoiceSettings,
  setAppDataItem,
} from './app-data';
import {
  CARD_SIZE_KEY,
  COLOR_SCHEME_KEY,
  DATA_SOURCES_KEY,
  SRD_CACHE_KEY_PREFIX,
  UPLOADS_KEY,
} from './keys';
import { DEFAULT_STT_SETTINGS, STT_SETTINGS_KEY } from '../stt';

function blockStorageOperation(operation: keyof typeof storageControls): () => void {
  let releaseGate = () => {};
  storageControls[operation] = new Promise((resolve) => {
    releaseGate = resolve;
  });
  return releaseGate;
}

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
    const releaseSetItem = blockStorageOperation('setItemGate');

    const write = setAppDataItem(DATA_SOURCES_KEY, '{"aiApiKey":"secret"}');
    await Promise.resolve();

    const reset = resetStoredAppData();
    releaseSetItem();

    await Promise.all([write, reset]);

    expect(storage.get(DATA_SOURCES_KEY)).toBeUndefined();
    expect(storage.get('unrelated:other-app')).toBe('keep');
  });

  it('ignores stale hydration reads that resolve after reset starts', async () => {
    const releaseGetItem = blockStorageOperation('getItemGate');

    const read = getAppDataItem(STT_SETTINGS_KEY);
    await Promise.resolve();

    const generation = beginAppDataReset();
    finishAppDataReset(generation);
    releaseGetItem();

    expect(await read).toBeNull();
  });

  it('loads and saves voice settings through the local app data seam', async () => {
    const settings = {
      provider: 'deepgram' as const,
      deepgramApiKey: 'voice-secret',
    };

    await expect(saveVoiceSettings(settings)).resolves.toBe(true);
    expect(JSON.parse(storage.get(STT_SETTINGS_KEY)!)).toEqual(settings);
    await expect(loadVoiceSettings()).resolves.toEqual(settings);
  });

  it('validates loaded voice settings through the local app data seam', async () => {
    storage.set(STT_SETTINGS_KEY, JSON.stringify({
      provider: 'bogus-provider',
      deepgramApiKey: 42,
    }));

    await expect(loadVoiceSettings()).resolves.toEqual(DEFAULT_STT_SETTINGS);
  });

  it('loads data source settings through the local app data seam', async () => {
    storage.set(DATA_SOURCES_KEY, JSON.stringify({
      srdEnabled: false,
      kankaToken: 'kanka-secret',
      srdSources: ['kobold-press-tob'],
    }));

    await expect(loadDataSourceSettings()).resolves.toEqual({
      ...DEFAULT_DATA_SOURCES_SETTINGS,
      srdEnabled: false,
      kankaToken: 'kanka-secret',
      srdSources: ['kobold-press-tob'],
    });
  });

  it('saves data source settings through the local app data seam', async () => {
    await resetStoredAppData();
    const cacheWriteToken = createAppDataWriteToken();
    const settings = {
      ...DEFAULT_DATA_SOURCES_SETTINGS,
      googleDocsUrl: 'https://docs.google.com/document/d/campaign',
    };

    expect(canPersistAppDataCache(cacheWriteToken)).toBe(false);
    await expect(saveDataSourceSettings(settings)).resolves.toBe(true);

    expect(JSON.parse(storage.get(DATA_SOURCES_KEY)!)).toEqual(settings);
    expect(canPersistAppDataCache(cacheWriteToken)).toBe(true);
  });

  it('drops stale data source settings hydration through the local app data seam', async () => {
    storage.set(DATA_SOURCES_KEY, JSON.stringify({ aiApiKey: 'stale-secret' }));
    const releaseGetItem = blockStorageOperation('getItemGate');

    const read = loadDataSourceSettings();
    await Promise.resolve();

    const generation = beginAppDataReset();
    finishAppDataReset(generation);
    releaseGetItem();

    await expect(read).resolves.toBeNull();
  });

  it('drops stale data source settings writes through the local app data seam', async () => {
    const releaseSetItem = blockStorageOperation('setItemGate');

    const write = saveDataSourceSettings({
      ...DEFAULT_DATA_SOURCES_SETTINGS,
      aiApiKey: 'secret',
    });
    await Promise.resolve();

    const reset = resetStoredAppData();
    releaseSetItem();

    await expect(write).resolves.toBe(false);
    await reset;

    expect(storage.get(DATA_SOURCES_KEY)).toBeUndefined();
  });
});
