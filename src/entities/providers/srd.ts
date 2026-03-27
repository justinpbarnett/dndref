import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entity, EntityIndex, WorldDataProvider, slugify, stripHtml } from '../index';

const OPEN5E = 'https://api.open5e.com/v1';
const CACHE_KEY = 'dndref:srd-cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface SRDCache {
  ts: number;
  entities: EntityIndex;
}

export class SRDProvider implements WorldDataProvider {
  readonly name = 'D&D 5e SRD';

  async load(): Promise<EntityIndex> {
    const cached = await loadCache();
    if (cached) return cached;

    const [monsters, items] = await Promise.all([
      fetchAll<any>(`${OPEN5E}/monsters/?limit=500`),
      fetchAll<any>(`${OPEN5E}/magicitems/?limit=500`),
    ]);
    const entities = [
      ...monsters.map(monsterToEntity),
      ...items.map(itemToEntity),
    ];
    await saveCache(entities);
    return entities;
  }

  getName(): string { return this.name; }
}

async function loadCache(): Promise<EntityIndex | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as SRDCache;
    if (Date.now() - cache.ts > CACHE_TTL_MS) return null;
    return cache.entities;
  } catch {
    return null;
  }
}

async function saveCache(entities: EntityIndex): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), entities }));
  } catch {
    // Storage full -- skip caching
  }
}

async function fetchAll<T>(url: string): Promise<T[]> {
  const results: T[] = [];
  let next: string | null = url;
  while (next) {
    const res = await fetch(next);
    if (!res.ok) throw new Error(`SRD fetch failed: ${res.status} ${next}`);
    const data = await res.json() as { results: T[]; next: string | null };
    results.push(...data.results);
    next = data.next;
  }
  return results;
}

function monsterToEntity(m: any): Entity {
  const cr = m.challenge_rating ?? '?';
  const ac = m.armor_class ?? '?';
  const hp = m.hit_points ?? '?';
  const str = m.strength ?? '?';
  const dex = m.dexterity ?? '?';
  const con = m.constitution ?? '?';
  const int_ = m.intelligence ?? '?';
  const wis = m.wisdom ?? '?';
  const cha = m.charisma ?? '?';
  const summary = `CR ${cr} · ${m.size ?? ''} ${m.type ?? ''}. AC ${ac}, HP ${hp}. STR ${str} DEX ${dex} CON ${con} INT ${int_} WIS ${wis} CHA ${cha}.`;
  return {
    id: `srd-monster-${m.slug ?? slugify(m.name)}`,
    name: m.name,
    type: 'NPC',
    aliases: [],
    summary: summary.trim(),
    image: m.img_main ?? undefined,
  };
}

function itemToEntity(item: any): Entity {
  const rarity = item.rarity ? capitalize(item.rarity) : '';
  const desc = stripHtml(item.desc ?? '').slice(0, 200);
  return {
    id: `srd-item-${item.slug ?? slugify(item.name)}`,
    name: item.name,
    type: 'Item',
    aliases: [],
    summary: [rarity, desc].filter(Boolean).join('. '),
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
