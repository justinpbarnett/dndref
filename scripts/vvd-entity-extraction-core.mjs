import { normalizeEntity, slugify } from './vvd-entity-normalization.mjs';

export function extractEntitiesFromLog(apiLog) {
  const entities = [];
  const seen = new Set();

  for (const entry of apiLog) {
    const candidates = findEntityCandidates(entry.body);
    for (const candidate of candidates) {
      const id = candidate.id ?? candidate.slug ?? slugify(candidate.name ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      entities.push(normalizeEntity(candidate));
    }
  }

  return entities;
}

export function findEntityCandidates(data) {
  if (!data || typeof data !== 'object') return [];

  if (data.name && (data.content || data.description || data.summary || data.body)) {
    return [data];
  }

  if (Array.isArray(data)) {
    return data.flatMap(findEntityCandidates);
  }

  const listKeys = ['data', 'items', 'results', 'articles', 'entries', 'nodes', 'edges'];
  for (const key of listKeys) {
    if (Array.isArray(data[key])) {
      return data[key].flatMap(findEntityCandidates);
    }
    if (Array.isArray(data[key]?.edges)) {
      return data[key].edges.map((edge) => edge.node).flatMap(findEntityCandidates);
    }
  }

  for (const val of Object.values(data)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const candidates = findEntityCandidates(val);
      if (candidates.length) return candidates;
    }
  }

  return [];
}
