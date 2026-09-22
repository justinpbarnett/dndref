/**
 * How detection is tuned.
 *
 * These numbers only make sense against each other, so they are stated once,
 * together: a looser `threshold` needs a longer `minWordChars` to stay quiet,
 * and `carryOverChars` only matters because `intervalMs` cuts the transcript
 * into passes that a spoken name can straddle. Tuning detection means editing
 * this file and nothing else.
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
   * Fuse.js match tolerance: 0 is exact, 1 matches anything. Kept low because
   * table talk is mostly ordinary words, and a card for the wrong entity costs
   * the DM more attention than a missed one.
   */
  threshold: 0.28,

  /**
   * Fuse.js: how many characters must match in a run before a hit counts. This
   * filters the *entity* side of the comparison.
   */
  minMatchChars: 4,

  /**
   * Transcript words shorter than this are never searched. This filters the
   * *transcript* side -- the same number as `minMatchChars`, but a different
   * question, which is why both are named.
   */
  minWordChars: 4,

  /**
   * Entity names run to about three words ("The Prancing Pony"), so every run
   * of one to three transcript words is searched.
   */
  maxPhraseWords: 3,

  /**
   * How much of the transcript tail carries into the next pass, so a name
   * spoken across a pass boundary is still searched as one phrase.
   */
  carryOverChars: 80,
} as const;
