export function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function normalizeEntity(raw) {
  const name = raw.name ?? raw.title ?? 'Unknown';
  const type = normalizeType(raw.type ?? raw.category ?? raw.kind ?? '');
  const summary = raw.summary ?? raw.description ?? raw.content ?? raw.body ?? raw.excerpt ?? '';
  const aliases = raw.aliases ?? raw.alternativeNames ?? raw.also_known_as ?? [];
  return { name, type, summary: stripHtml(summary), aliases };
}

export function normalizeType(raw) {
  const s = String(raw).toLowerCase();
  if (s.includes('npc') || s.includes('character') || s.includes('person')) return 'NPC';
  if (s.includes('location') || s.includes('place') || s.includes('region') || s.includes('city')) return 'Location';
  if (s.includes('faction') || s.includes('organization') || s.includes('group') || s.includes('guild')) return 'Faction';
  if (s.includes('item') || s.includes('artifact') || s.includes('object') || s.includes('weapon')) return 'Item';
  return 'Unknown';
}

export function stripHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}
