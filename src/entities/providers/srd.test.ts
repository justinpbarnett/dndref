import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());
const fetchAllMock = vi.hoisted(() => vi.fn());

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    getAllKeys: vi.fn(async () => Array.from(storage.keys())),
    multiRemove: vi.fn(async (keys: readonly string[]) => {
      keys.forEach((key) => storage.delete(key));
    }),
  },
}));

vi.mock('../../utils/providers', () => ({
  fetchAll: fetchAllMock,
}));

import { SRDProvider } from './srd';
import { resetAppDataControlsForTests, resetStoredAppData } from '../../storage/app-data';
import { SRD_CACHE_KEY_PREFIX } from '../../storage/keys';

describe('SRD cache persistence', () => {
  beforeEach(() => {
    storage.clear();
    fetchAllMock.mockReset();
    fetchAllMock.mockImplementation(async (url: string) => {
      if (url.includes('/monsters/')) {
        return [{ name: 'Goblin', slug: 'goblin', challenge_rating: '1/4' }];
      }
      return [{ name: 'Bag of Holding', slug: 'bag-of-holding', desc: 'A magic bag.' }];
    });
    resetAppDataControlsForTests();
  });

  it('writes SRD cache during normal provider loads', async () => {
    await new SRDProvider(['wotc-srd']).load();

    expect([...storage.keys()].some((key) => key.startsWith(SRD_CACHE_KEY_PREFIX))).toBe(true);
  });

  it('does not recreate SRD cache immediately after delete-all reset', async () => {
    await resetStoredAppData();
    await new SRDProvider(['wotc-srd']).load();

    expect([...storage.keys()].some((key) => key.startsWith(SRD_CACHE_KEY_PREFIX))).toBe(false);
  });

  it('keeps full magic item details while providing a compact card summary', async () => {
    const longDescription = [
      'If you hold this beetle-shaped medallion in your hand for 1 round, an inscription appears on its surface revealing its magical nature.',
      'It provides two benefits while it is on your person:',
      '* You have advantage on saving throws against spells.',
      '* The scarab has 12 charges. If you fail a saving throw against a necromancy spell or a harmful effect originating from an undead creature, you can use your reaction to expend 1 charge and turn the failed save into a successful one.',
    ].join('\n');

    fetchAllMock.mockImplementation(async (url: string) => {
      if (url.includes('/monsters/')) return [];
      return [{ name: 'Scarab of Protection', slug: 'scarab-of-protection', rarity: 'legendary', desc: longDescription }];
    });

    const entities = await new SRDProvider(['wotc-srd']).load();

    expect(entities).toEqual([
      expect.objectContaining({
        name: 'Scarab of Protection',
        summary: expect.stringMatching(/^Legendary\. If you hold this beetle-shaped medallion/),
        details: expect.stringContaining('* The scarab has 12 charges'),
      }),
    ]);
    expect(entities[0].summary.length).toBeLessThan(entities[0].details!.length);
  });
});
