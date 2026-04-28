import Fuse from "fuse.js";

import { Entity, EntityIndex } from "./index";

type SearchTerm = { term: string; entity: Entity };

export class EntityDetector {
  private fuse: Fuse<SearchTerm>;

  constructor(entities: EntityIndex) {
    const terms: SearchTerm[] = entities.flatMap((e) => [
      { term: e.name, entity: e },
      ...e.aliases.map((a) => ({ term: a, entity: e })),
    ]);

    this.fuse = new Fuse(terms, {
      keys: ["term"],
      threshold: 0.28,
      minMatchCharLength: 4,
      includeScore: true,
    });
  }

  detect(transcript: string): Entity[] {
    const words = transcript.split(/\s+/).filter((w) => w.replace(/[^a-z]/gi, "").length >= 4);
    const found = new Map<string, { entity: Entity; score: number }>();

    const phrases: string[] = [...words];
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(`${words[i]} ${words[i + 1]}`);
      if (i < words.length - 2) {
        phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      }
    }

    for (const phrase of phrases) {
      const results = this.fuse.search(phrase);
      if (results.length === 0) continue;
      const best = results[0];
      const score = best.score ?? 1;
      const id = best.item.entity.id;
      const existing = found.get(id);
      if (!existing || score < existing.score) {
        found.set(id, { entity: best.item.entity, score });
      }
    }

    return Array.from(found.values())
      .sort((a, b) => a.score - b.score)
      .map((r) => r.entity);
  }
}
