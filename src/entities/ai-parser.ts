import { CORS_PROXY } from '../proxy';

import { Entity, EntityIndex, normalizeEntityType, slugify } from './index';

interface AIEntityInput {
  name: string;
  type?: string;
  aliases?: string[];
  summary?: string;
}

const ANTHROPIC_API = CORS_PROXY
  ? `${CORS_PROXY}/anthropic/v1/messages`
  : 'https://api.anthropic.com/v1/messages';

const PROMPT = `Extract all named D&D entities from the content below.

For each entity output JSON with these fields:
- name: the entity's name
- type: one of "NPC", "Location", "Faction", "Item", "Unknown"
- aliases: array of alternative names or titles (can be empty)
- summary: 2-3 sentences of key info useful to a DM during play

Include: characters, NPCs, deities, creatures, places, regions, cities, organizations, factions, notable items, artifacts.
Exclude: generic game mechanics, spell names, class names, conditions.

Output ONLY a valid JSON array. No explanation, no markdown fences.

Content:
---
`;

export async function parseWithAI(content: string, apiKey: string): Promise<EntityIndex> {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      ...(!CORS_PROXY && { 'anthropic-dangerous-direct-browser-access': 'true' }),
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: PROMPT + content }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AI parse failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json() as { content: Array<{ text: string }> };
  const raw = data.content[0]?.text ?? '[]';

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI returned no JSON array');

  let items: unknown;
  try {
    items = JSON.parse(match[0]);
  } catch {
    throw new Error('AI returned invalid JSON');
  }

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item): item is AIEntityInput => !!item && typeof item.name === 'string')
    .map((item, i): Entity => ({
      id: `ai-${slugify(item.name)}-${Date.now()}-${i}`,
      name: item.name,
      type: normalizeEntityType(item.type ?? ''),
      aliases: Array.isArray(item.aliases) ? item.aliases : [],
      summary: item.summary ?? '',
    }));
}
