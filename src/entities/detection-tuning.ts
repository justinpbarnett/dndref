/**
 * How detection is tuned.
 *
 * These numbers only make sense against each other, so they are stated once,
 * together: a looser `maxEditRatio` needs a longer `minFuzzyChars` to stay
 * quiet, and `carryOverChars` only matters because `intervalMs` cuts the
 * transcript into passes that a spoken name can straddle. Tuning detection
 * means editing this file and nothing else.
 *
 * All of it governs fuzzy matching, which is how the app matches by default.
 * A ruleset that asks for exact matching takes none of these: exact matching
 * derives its phrase width from the longest name indexed and filters no words
 * out at all. See `detection-mode.ts`.
 */
export const DETECTION_TUNING = {
  /** How often the detector runs over new transcript while a session is active. */
  intervalMs: 2000,

  /**
   * Transcript words shorter than this are never searched on their own. A
   * longer phrase may still contain one ("the bard", "potion of healing").
   */
  minWordChars: 4,

  /**
   * A word shorter than this is matched whole or not at all. One edit of a
   * four-letter word is another word ("mage" / "make"), so misspellings start
   * here.
   */
  minFuzzyChars: 6,

  /**
   * How much of a word a misspelling may change. One edit in five letters.
   * Budget is counted on letters, not on spaces or apostrophes, so "gold
   * dragon" cannot spend the spaces to become "blue dragon", and "Valdrath's"
   * does not become "Valdrath".
   */
  maxEditRatio: 0.2,

  /** The shorter word must still be this much of the longer one. "plan" is not "planetar". */
  minLengthRatio: 0.8,

  /**
   * A single word may stand in for a two-word name ("Gimble" for "Gimble
   * Lock") when the leading word is at least this long, the other word is at
   * most `maxCompanionChars`, and the leading word leads by `minStandaloneMargin`.
   */
  minStandaloneChars: 6,
  maxCompanionChars: 4,
  minStandaloneMargin: 2,

  /**
   * Misspellings are compared up to this many words. Longer titles still match
   * exactly, over a window as wide as the longest name in the index.
   */
  maxFuzzyPhraseWords: 4,

  /** Dropped from the front of a name, and ignored when picking its leading word. */
  articles: ["a", "an", "the"],

  /** A name containing one of these is a compound title and is matched whole ("Potion of Healing"). */
  compoundMarkers: ["of"],

  /**
   * Leading words that are ordinary speech. They never stand in for a longer
   * title: "purple" does not raise Purple Worm, "awakened" does not raise
   * Awakened Tree. The full title still matches.
   */
  ordinaryLeadingWords: [
    "awakened",
    "berserker",
    "crystal",
    "elemental",
    "folding",
    "guardian",
    "immovable",
    "portable",
    "purple",
    "sovereign",
    "spirit",
    "weapon",
    "winter",
  ],

  /**
   * How much of the transcript tail carries into the next pass, so a name
   * spoken across a pass boundary is still searched as one phrase.
   */
  carryOverChars: 80,
} as const;
