/**
 * Detection by exact name -- the alternative the fuzzy detector is swapped for
 * when a build sets EXPO_PUBLIC_EXACT_MATCHING (see `detection-mode.ts`).
 *
 * Fuzzy matching asks what a transcript is nearly saying, which is the right
 * question for a campaign whose names are invented. It is the wrong one for a
 * world named in ordinary English. Measured against Scryfall's 38,906 Magic
 * cards, the fuzzy detector returned five to nine cards for every sentence of
 * table talk that named nothing at all, and took 1.1-3.3s per pass against a
 * 2s interval. Matching exactly returns the same true hits in tens of
 * microseconds and says nothing to the rest.
 *
 * The transcript is read left to right, taking the longest name that fits at
 * each position, so "Lightning Bolt" does not also raise "Lightning". Unlike
 * the fuzzy path, nothing filters short words out first: dropping them would
 * break every name built from them, like "Swords to Plowshares".
 */
import { Entity, EntityIndex } from "./index";

/**
 * The one spelling both sides of the comparison are reduced to.
 *
 * Apostrophes are dropped rather than spaced, because a transcript may or may
 * not carry them ("Gaea's Cradle", "Gaeas Cradle") and both must land on the
 * same string. Every other separator becomes a space, because a transcript
 * spells a hyphenated name out in words ("Eight and a Half Tails").
 */
const normalize = (text: string): string =>
  text
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const wordCount = (name: string): number => name.split(" ").length;

export function exactDetection(entities: EntityIndex): (transcript: string) => Entity[] {
  const byName = new Map(
    entities.flatMap((entity) => [entity.name, ...entity.aliases].map((term) => [normalize(term), entity] as const)),
  );
  // Reduced rather than spread into Math.max: a card index runs to tens of
  // thousands of names, and a spread that wide overflows the stack.
  const longestName = [...byName.keys()].reduce((longest, name) => Math.max(longest, wordCount(name)), 0);

  return (transcript) => {
    const words = normalize(transcript).split(" ").filter(Boolean);
    const found = new Map<string, Entity>();

    for (let i = 0; i < words.length; i++) {
      for (let width = Math.min(longestName, words.length - i); width >= 1; width--) {
        const hit = byName.get(words.slice(i, i + width).join(" "));
        if (!hit) continue;
        found.set(hit.id, hit);
        i += width - 1;
        break;
      }
    }

    return [...found.values()];
  };
}
