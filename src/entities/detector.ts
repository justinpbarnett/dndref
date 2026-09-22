import Fuse from "fuse.js";

import { exactMatchingEnabled } from "./detection-mode";
import { DETECTION_TUNING } from "./detection-tuning";
import { exactDetection } from "./exact-detection";

import { Entity, EntityIndex } from "./index";

type SearchTerm = { term: string; entity: Entity };

export class EntityDetector {
  private readonly matchTranscript: (transcript: string) => Entity[];

  constructor(entities: EntityIndex) {
    this.matchTranscript = exactMatchingEnabled() ? exactDetection(entities) : fuzzyDetection(entities);
  }

  detect(transcript: string): Entity[] {
    return this.matchTranscript(transcript);
  }
}

function fuzzyDetection(entities: EntityIndex): (transcript: string) => Entity[] {
  const terms: SearchTerm[] = entities.flatMap((e) => [
    { term: e.name, entity: e },
    ...e.aliases.map((a) => ({ term: a, entity: e })),
  ]);

  const fuse = new Fuse(terms, {
    keys: ["term"],
    threshold: DETECTION_TUNING.threshold,
    minMatchCharLength: DETECTION_TUNING.minMatchChars,
    includeScore: true,
  });

  return (transcript) => {
    const words = transcript
      .split(/\s+/)
      .filter((w) => w.replace(/[^a-z]/gi, "").length >= DETECTION_TUNING.minWordChars);
    const found = new Map<string, { entity: Entity; score: number }>();

    const phrases: string[] = [...words];
    for (let i = 0; i < words.length; i++) {
      for (let width = 2; width <= DETECTION_TUNING.maxPhraseWords && i + width <= words.length; width++) {
        phrases.push(words.slice(i, i + width).join(" "));
      }
    }

    for (const phrase of phrases) {
      const results = fuse.search(phrase);
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
  };
}
