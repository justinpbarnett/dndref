import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
  },
}));

import { addUpload, getUploads, removeUpload } from './file-upload';

describe('file upload storage', () => {
  beforeEach(() => {
    storage.clear();
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
});
