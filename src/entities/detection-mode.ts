/**
 * Which way the detector matches a transcript against the world.
 *
 * Fuzzy matching asks what a transcript is nearly saying. That is the right
 * question for a campaign, where names are invented and a near miss is still
 * the entity that was meant. It is the wrong question for a world named in
 * ordinary English -- a Magic card index, say -- where "she might come by"
 * fuzzily matches Mightstone and Comeuppance and the stack fills with noise.
 *
 * The mode used to be read from EXPO_PUBLIC_EXACT_MATCHING, so a build served
 * one kind of table and switching meant a rebuild. Each ruleset now names the
 * mode its world needs (see `src/rulesets/index.ts`), which is what lets one
 * build serve a D&D campaign and a Magic card index from the same tab.
 */
export const MATCHING_MODES = ["fuzzy", "exact"] as const;

export type MatchingMode = (typeof MATCHING_MODES)[number];

export const DEFAULT_MATCHING_MODE: MatchingMode = "fuzzy";
