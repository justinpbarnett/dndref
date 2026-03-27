export type EntityType = 'Location' | 'NPC' | 'Faction' | 'Item' | 'Unknown';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  aliases: string[];
  summary: string;
  image?: string;
}

export type EntityIndex = Entity[];

export interface WorldDataProvider {
  load(): Promise<EntityIndex>;
  getName(): string;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function normalizeEntityType(raw: string): EntityType {
  const s = String(raw).toLowerCase();
  if (s.includes('npc') || s.includes('character') || s.includes('person')) return 'NPC';
  if (s.includes('location') || s.includes('place') || s.includes('region') || s.includes('city')) return 'Location';
  if (s.includes('faction') || s.includes('organization') || s.includes('group') || s.includes('guild')) return 'Faction';
  if (s.includes('item') || s.includes('artifact') || s.includes('object') || s.includes('weapon')) return 'Item';
  return 'Unknown';
}
