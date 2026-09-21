import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());
const storageControls = vi.hoisted(() => ({
  getItemGate: null as Promise<void> | null,
  setItemGate: null as Promise<void> | null,
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
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
    multiRemove: vi.fn(async (keys: readonly string[]) => keys.forEach((key) => storage.delete(key))),
  },
}));

import { APP_STORAGE_KEYS, isAppStorageKey, openAppData, resetAppDataForTests, resetStoredAppData } from "./app-data";
import { CARD_SIZE_KEY, COLOR_SCHEME_KEY, DATA_SOURCES_KEY, SRD_CACHE_KEY_PREFIX, UPLOADS_KEY } from "./keys";
import {
  DEFAULT_DATA_SOURCES_SETTINGS,
  loadDataSourceSettings,
  loadVoiceSettings,
  saveDataSourceSettings,
  saveVoiceSettings,
} from "./settings";
import { addUploadedFile, getUploadedFiles, removeUploadedFile } from "./uploads";
import { DEFAULT_STT_SETTINGS, STT_SETTINGS_KEY } from "../stt/index";

function blockStorageOperation(operation: keyof typeof storageControls): () => void {
  let releaseGate = () => {};
  storageControls[operation] = new Promise((resolve) => {
    releaseGate = resolve;
  });
  return releaseGate;
}

async function expectStaleHydrationReadDropped(readStaleValue: () => Promise<unknown>) {
  const releaseGetItem = blockStorageOperation("getItemGate");
  const read = readStaleValue();
  await Promise.resolve();

  await resetStoredAppData();
  releaseGetItem();

  await expect(read).resolves.toBeNull();
}

async function resetWhileStorageBlocked(
  operation: keyof typeof storageControls,
  startBlockedWrite: () => Promise<unknown>,
) {
  const release = blockStorageOperation(operation);
  const write = startBlockedWrite();
  await Promise.resolve();
  const reset = resetStoredAppData();
  release();
  await Promise.all([write, reset]);
}

describe("local app data", () => {
  beforeEach(() => {
    resetAppDataForTests();
    storageControls.getItemGate = null;
    storageControls.setItemGate = null;
    storage.clear();
    storage.set(UPLOADS_KEY, "[]");
    storage.set(DATA_SOURCES_KEY, "{}");
    storage.set(`${SRD_CACHE_KEY_PREFIX}wotc-srd`, "{}");
    storage.set(STT_SETTINGS_KEY, "{}");
    storage.set(CARD_SIZE_KEY, "M");
    storage.set("unrelated:other-app", "keep");
  });

  it("recognizes app-owned keys only", () => {
    for (const key of [...APP_STORAGE_KEYS, "dndref:file-uploads", "dndref:srd-wotc-srd", "@dnd-ref/stt-settings"])
      expect(isAppStorageKey(key)).toBe(true);
    expect(isAppStorageKey("unrelated:other-app")).toBe(false);
  });

  it("removes app-owned keys while preserving unrelated storage", async () => {
    expect((await resetStoredAppData()).sort()).toEqual([
      "@dnd-ref/card-size",
      "@dnd-ref/stt-settings",
      "dndref:data-sources",
      "dndref:file-uploads",
      "dndref:srd-wotc-srd",
    ]);
    expect(Array.from(storage.keys())).toEqual(["unrelated:other-app"]);
  });

  it("keeps the storage key manifest in sync with known fixed keys", () => {
    expect([...APP_STORAGE_KEYS].sort()).toEqual(
      [CARD_SIZE_KEY, COLOR_SCHEME_KEY, DATA_SOURCES_KEY, STT_SETTINGS_KEY, UPLOADS_KEY].sort(),
    );
  });

  it("refuses writes from a session opened before a wipe", async () => {
    const stale = openAppData();
    await resetStoredAppData();

    expect(stale.isCurrent()).toBe(false);
    await expect(stale.write(CARD_SIZE_KEY, "L")).resolves.toBe(false);
    expect(storage.has(CARD_SIZE_KEY)).toBe(false);
  });

  it("blocks cache writes after a wipe until a real write lands", async () => {
    await resetStoredAppData();
    const blockedKey = `${SRD_CACHE_KEY_PREFIX}blocked`;
    const allowedKey = `${SRD_CACHE_KEY_PREFIX}allowed`;

    await expect(openAppData().cache(blockedKey, "{}")).resolves.toBe(false);
    expect(storage.has(blockedKey)).toBe(false);

    await expect(openAppData().write(CARD_SIZE_KEY, "L")).resolves.toBe(true);

    await expect(openAppData().cache(allowedKey, "{}")).resolves.toBe(true);
    expect(storage.get(allowedKey)).toBe("{}");
  });

  it("waits for in-flight writes before clearing storage", async () => {
    await resetWhileStorageBlocked("setItemGate", () =>
      openAppData().write(DATA_SOURCES_KEY, '{"aiApiKey":"secret"}'),
    );

    expect(storage.get(DATA_SOURCES_KEY)).toBeUndefined();
    expect(storage.get("unrelated:other-app")).toBe("keep");
  });

  it("ignores hydration reads that resolve after a wipe", async () => {
    await expectStaleHydrationReadDropped(() => openAppData().read(STT_SETTINGS_KEY));
  });

  it("adds, removes, and reads uploaded files", async () => {
    await expect(addUploadedFile("one.md", "# One")).resolves.toBe(true);
    await expect(addUploadedFile("two.md", "# Two")).resolves.toBe(true);

    const [first] = await getUploadedFiles();
    await expect(removeUploadedFile(first.id)).resolves.toBe(true);

    expect((await getUploadedFiles()).map((u) => u.name)).toEqual(["two.md"]);
  });

  it("keeps concurrent upload mutations from losing each other", async () => {
    await Promise.all([addUploadedFile("a.md", "# A"), addUploadedFile("b.md", "# B")]);

    expect((await getUploadedFiles()).map((u) => u.name).sort()).toEqual(["a.md", "b.md"]);
  });

  it("waits for in-flight upload mutations before clearing storage", async () => {
    await resetWhileStorageBlocked("getItemGate", () => addUploadedFile("late.md", "# Late"));
    storageControls.getItemGate = null;

    expect(await getUploadedFiles()).toEqual([]);
    expect(storage.get("unrelated:other-app")).toBe("keep");
  });

  it("loads and saves voice settings", async () => {
    const settings = { provider: "deepgram" as const, deepgramApiKey: "voice-secret" };

    await expect(saveVoiceSettings(settings)).resolves.toBe(true);
    expect(JSON.parse(storage.get(STT_SETTINGS_KEY)!)).toEqual(settings);
    await expect(loadVoiceSettings()).resolves.toEqual(settings);
  });

  it("validates loaded voice settings", async () => {
    storage.set(STT_SETTINGS_KEY, JSON.stringify({ provider: "bogus-provider", deepgramApiKey: 42 }));

    await expect(loadVoiceSettings()).resolves.toEqual(DEFAULT_STT_SETTINGS);
  });

  it("loads data source settings", async () => {
    storage.set(
      DATA_SOURCES_KEY,
      JSON.stringify({ srdEnabled: false, kankaToken: "kanka-secret", srdSources: ["kobold-press-tob"] }),
    );

    await expect(loadDataSourceSettings()).resolves.toEqual({
      ...DEFAULT_DATA_SOURCES_SETTINGS,
      srdEnabled: false,
      kankaToken: "kanka-secret",
      srdSources: ["kobold-press-tob"],
    });
  });

  it("saves data source settings and re-allows cache writes", async () => {
    await resetStoredAppData();
    const cacheKey = `${SRD_CACHE_KEY_PREFIX}after-save`;
    const settings = {
      ...DEFAULT_DATA_SOURCES_SETTINGS,
      googleDocsUrl: "https://docs.google.com/document/d/campaign",
    };

    await expect(openAppData().cache(cacheKey, "{}")).resolves.toBe(false);
    await expect(saveDataSourceSettings(settings)).resolves.toBe(true);

    expect(JSON.parse(storage.get(DATA_SOURCES_KEY)!)).toEqual(settings);
    await expect(openAppData().cache(cacheKey, "{}")).resolves.toBe(true);
  });

  it("drops stale data source settings hydration", async () => {
    storage.set(DATA_SOURCES_KEY, JSON.stringify({ aiApiKey: "stale-secret" }));
    await expectStaleHydrationReadDropped(loadDataSourceSettings);
  });

  it("drops data source settings writes that a wipe overtakes", async () => {
    const releaseSetItem = blockStorageOperation("setItemGate");

    const write = saveDataSourceSettings({ ...DEFAULT_DATA_SOURCES_SETTINGS, aiApiKey: "secret" });
    await Promise.resolve();

    const reset = resetStoredAppData();
    releaseSetItem();

    await expect(write).resolves.toBe(false);
    await reset;

    expect(storage.get(DATA_SOURCES_KEY)).toBeUndefined();
  });
});
