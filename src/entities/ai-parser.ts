import { fetchOutbound, usesProxy } from "../proxy";

import { EntityIndex } from "./index";
import { ingestEntityRecords } from "./ingestion";

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
  const res = await fetchOutbound("anthropic", "/v1/messages", {
    method: "POST",
    sourceName: "Claude",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      ...(!usesProxy() && { "anthropic-dangerous-direct-browser-access": "true" }),
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: PROMPT + content }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI parse failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { content: Array<{ text: string }> };
  const raw = data.content[0]?.text ?? "[]";

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("AI returned no JSON array");

  let items: unknown;
  try {
    items = JSON.parse(match[0]);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  if (!Array.isArray(items)) return [];

  return ingestEntityRecords(items, { idPrefix: "ai", idNamespace: Date.now() });
}
