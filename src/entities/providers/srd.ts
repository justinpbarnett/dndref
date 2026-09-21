import { openAppData, type AppDataSession } from "../../storage/app-data";
import { SRD_CACHE_KEY_PREFIX } from "../../storage/keys";
import { fetchAll } from "../../utils/providers";
import { EntityIndex, WorldDataProvider } from "../index";
import { itemToEntity, monsterToEntity } from "./srd/mappers";

const OPEN5E = "https://api.open5e.com/v1";
export type SRDSource = { slug: string; label: string; publisher: string };

export const SRD_SOURCES: SRDSource[] = [
  { slug: "o5e", label: "Open5e Original Content", publisher: "Open5e" },
  { slug: "wotc-srd", label: "5e Core Rules", publisher: "Wizards of the Coast" },
  { slug: "tob", label: "Tome of Beasts", publisher: "Kobold Press" },
  { slug: "cc", label: "Creature Codex", publisher: "Kobold Press" },
  { slug: "tob2", label: "Tome of Beasts 2", publisher: "Kobold Press" },
  { slug: "dmag", label: "Deep Magic 5e", publisher: "Kobold Press" },
  { slug: "tob3", label: "Tome of Beasts 3", publisher: "Kobold Press" },
  { slug: "kp", label: "Kobold Press Compilation", publisher: "Kobold Press" },
  { slug: "dmag-e", label: "Deep Magic Extended", publisher: "Kobold Press" },
  { slug: "warlock", label: "Warlock Archives", publisher: "Kobold Press" },
  { slug: "vom", label: "Vault of Magic", publisher: "Kobold Press" },
  { slug: "toh", label: "Tome of Heroes", publisher: "Kobold Press" },
  { slug: "blackflag", label: "Black Flag SRD", publisher: "Kobold Press" },
  { slug: "tob-2023", label: "Tome of Beasts 2023", publisher: "Kobold Press" },
  { slug: "menagerie", label: "Level Up A5e Monstrous Menagerie", publisher: "EN Publishing" },
  { slug: "a5e", label: "Level Up Advanced 5e", publisher: "EN Publishing" },
  { slug: "tal-dorei", label: "Critical Role: Tal'Dorei Campaign Setting", publisher: "Green Ronin Publishing" },
];

type SRDCache = { ts: number; entities: EntityIndex };
type CacheSession = AppDataSession;

export class SRDProvider implements WorldDataProvider {
  readonly name = "D&D 5e SRD";
  constructor(private sources: string[] = ["wotc-srd"]) {}

  async load(): Promise<EntityIndex> {
    if (this.sources.length === 0) return [];
    const cacheSession = openAppData();
    const cacheKey = `${SRD_CACHE_KEY_PREFIX}v3-${[...this.sources].sort().join(",")}`;
    const cached = await loadCache(cacheKey, cacheSession);
    if (cached) return cached;

    const sourceParam = this.sources.join(",");
    const [monsters, items] = await Promise.all([
      fetchAll<any>(`${OPEN5E}/monsters/?limit=500&document__slug__in=${sourceParam}`, (data) => data.next ?? null),
      fetchAll<any>(`${OPEN5E}/magicitems/?limit=500&document__slug__in=${sourceParam}`, (data) => data.next ?? null),
    ]);
    const entities = [...monsters.map(monsterToEntity), ...items.map(itemToEntity)];
    await saveCache(cacheKey, entities, cacheSession);
    return entities;
  }
}

async function loadCache(key: string, cacheSession: CacheSession): Promise<EntityIndex | null> {
  try {
    const raw = await cacheSession.read(key);
    if (!raw) return null;
    const cache = JSON.parse(raw) as SRDCache;
    if (Date.now() - cache.ts > 7 * 24 * 60 * 60 * 1000) return null;
    return cache.entities;
  } catch {
    return null;
  }
}

async function saveCache(key: string, entities: EntityIndex, cacheSession: CacheSession): Promise<void> {
  const cache: SRDCache = { ts: Date.now(), entities };

  try {
    await cacheSession.cache(key, JSON.stringify(cache));
  } catch {}
}
