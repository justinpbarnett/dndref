import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());
const storageControls = vi.hoisted(() => ({
  getItemGate: null as Promise<void> | null,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => {
      await storageControls.getItemGate;
      return storage.get(key) ?? null;
    }),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    getAllKeys: vi.fn(async () => Array.from(storage.keys())),
    multiRemove: vi.fn(async (keys: readonly string[]) => {
      keys.forEach((key) => storage.delete(key));
    }),
  },
}));

import { addUpload, FileUploadProvider, getUploads, removeUpload } from './file-upload';
import { resetAppDataControlsForTests, resetStoredAppData } from '../../storage/app-data';

describe('file upload storage', () => {
  beforeEach(() => {
    storage.clear();
    storageControls.getItemGate = null;
    resetAppDataControlsForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves every file when uploads are added concurrently', async () => {
    await Promise.all([
      addUpload('one.md', '# One'),
      addUpload('two.md', '# Two'),
      addUpload('three.md', '# Three'),
    ]);

    const uploads = await getUploads();
    expect(uploads.map((u) => u.name).sort()).toEqual(['one.md', 'three.md', 'two.md']);
  });

  it('removes only the selected upload', async () => {
    await addUpload('keep.md', '# Keep');
    await addUpload('drop.md', '# Drop');
    await addUpload('also-keep.md', '# Also Keep');

    const drop = (await getUploads()).find((u) => u.name === 'drop.md');
    expect(drop).toBeDefined();

    await removeUpload(drop!.id);

    expect((await getUploads()).map((u) => u.name)).toEqual(['keep.md', 'also-keep.md']);
  });

  it('serializes mixed add and remove mutations', async () => {
    await addUpload('old.md', '# Old');
    const [old] = await getUploads();

    await Promise.all([
      removeUpload(old.id),
      addUpload('new-a.md', '# New A'),
      addUpload('new-b.md', '# New B'),
    ]);

    const uploads = await getUploads();
    expect(uploads.map((u) => u.name).sort()).toEqual(['new-a.md', 'new-b.md']);
  });

  it('does not resurrect an upload mutation that is in flight during reset', async () => {
    let releaseGetItem!: () => void;
    storageControls.getItemGate = new Promise((resolve) => {
      releaseGetItem = resolve;
    });

    const upload = addUpload('late.md', '# Late');
    await Promise.resolve();

    const reset = resetStoredAppData();
    releaseGetItem();

    await Promise.all([upload, reset]);
    storageControls.getItemGate = null;

    expect(await getUploads()).toEqual([]);
  });

  it('loads markdown, text, and JSON uploads through world data ingestion', async () => {
    await addUpload('bazaar.md', `
## Moonlit Bazaar
Type: place
Aliases: Night Market; Bazaar

Open only under the new moon.
`);
    await addUpload('captain.txt', `Captain Aria
Type: character
Aliases: Aria | the captain

Commands the east watch.`);
    await addUpload('items.json', JSON.stringify([
      {
        name: 'The Sundering Blade',
        type: 'artifact',
        aliases: ['Sundering Blade', 'the blade'],
        description: 'Can destroy a lich phylactery.',
      },
    ]));

    const entities = await new FileUploadProvider().load();

    expect(entities.map(({ name, type, aliases, summary }) => ({ name, type, aliases, summary }))).toEqual([
      {
        name: 'Moonlit Bazaar',
        type: 'Location',
        aliases: ['Night Market', 'Bazaar'],
        summary: 'Open only under the new moon.',
      },
      {
        name: 'Captain Aria',
        type: 'NPC',
        aliases: ['Aria', 'the captain'],
        summary: 'Commands the east watch.',
      },
      {
        name: 'The Sundering Blade',
        type: 'Item',
        aliases: ['Sundering Blade', 'the blade'],
        summary: 'Can destroy a lich phylactery.',
      },
    ]);
    expect(entities[2].id).toMatch(/^upload-the-sundering-blade-\d+-0$/);
  });

  it('falls back to markdown ingestion for invalid JSON uploads', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await addUpload('fallback.json', `
# Lord Ember
Type: npc
Aliases: Ember

Rules the cinder court.
`);

    const entities = await new FileUploadProvider().load();

    expect(warn).toHaveBeenCalledWith('[dnd-ref] Failed to parse JSON upload: fallback.json');
    expect(entities.map(({ name, type, aliases, summary }) => ({ name, type, aliases, summary }))).toEqual([
      {
        name: 'Lord Ember',
        type: 'NPC',
        aliases: ['Ember'],
        summary: 'Rules the cinder court.',
      },
    ]);
  });
});
