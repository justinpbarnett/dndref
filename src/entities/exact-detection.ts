/**
 * Detection by exact name -- the alternative the fuzzy detector is swapped for
 * when a build sets EXPO_PUBLIC_EXACT_MATCHING (see `detection-mode.ts`).
 *
 * Fuzzy matching asks what a transcript is nearly saying, which is the right
 * question for a campaign whose names are invented. It is the wrong one for a
 * world named in ordinary English. Measured against Scryfall's 38,906 Magic
 * cards, the fuzzy detector returned five to nine cards for every sentence of
 * table talk that named nothing at all, and took 1.1-3.3s per pass against a
 * 2s interval. The same corpus matched exactly raises nothing on that talk and
 * answers in under 100us.
 *
 * What that costs is the near miss fuzzy was there for: a name has to be spoken
 * in full. "Gimble" no longer reaches Gimble Lock, and a transcription that
 * mangles a name is simply missed. False positives and speed were measured;
 * recall against real speech was not, which is the open question a table test
 * is meant to answer and the reason this stays behind a flag.
 *
 * The transcript is read left to right, taking the longest name that fits at
 * each position, so "Lightning Bolt" does not also raise "Lightning". The same
 * rule means a name starting inside a longer one is passed over -- with both
 * "Sword Coast" and "Coast Road" indexed, "the Sword Coast Road" raises only
 * the first -- which is the price of not raising a fragment of every name. And
 * unlike the fuzzy path nothing filters short words out first: dropping them
 * would break every name built from them, like "Swords to Plowshares".
 */
import { Entity, EntityIndex, TranscriptMatcher } from "./index";

/**
 * The one spelling both sides of the comparison are reduced to.
 *
 * Apostrophes are dropped rather than spaced, because a transcript may or may
 * not carry them ("Gaea's Cradle", "Gaeas Cradle") and both must land on the
 * same string. Every other separator becomes a space, because a transcript
 * spells a hyphenated name out in words ("Eight and a Half Tails"). Accents are
 * folded away first, because speech-to-text writes plain ASCII and a world full
 * of names like "Faerun" would otherwise never match the "Faerûn" it indexed.
 */
const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const wordCount = (name: string): number => name.split(" ").length;

export function exactDetection(entities: EntityIndex): TranscriptMatcher {
  // Names are laid down before any alias, and neither overwrites a term already
  // claimed, so a word that is one entity's real name always resolves to that
  // entity rather than to whichever other entity happens to nickname it.
  const byName = new Map<string, Entity>();
  const claim = (term: string, entity: Entity) => {
    const key = normalize(term);
    if (key && !byName.has(key)) byName.set(key, entity);
  };
  for (const entity of entities) claim(entity.name, entity);
  for (const entity of entities) for (const alias of entity.aliases) claim(alias, entity);
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
