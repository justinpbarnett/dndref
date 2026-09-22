/**
 * Which way the detector matches a transcript against the world.
 *
 * Fuzzy matching suits a campaign, where names are unusual enough that a near
 * miss is still the right entity. It does not suit a world whose names are
 * ordinary English -- a Magic card index, say -- where "she might come by"
 * fuzzily matches Mightstone and Comeuppance and the stack fills with noise.
 *
 * This is a prototype switch, so it is read at build time rather than offered
 * in settings: `EXPO_PUBLIC_EXACT_MATCHING=1 just build-web` for exact, a plain
 * `just build-web` for fuzzy. Both clear Metro's cache, which they have to --
 * that cache does not key on EXPO_PUBLIC_* vars, so an export that skipped
 * --clear would quietly hand back whichever mode was built last.
 *
 * Metro inlines `process.env.EXPO_PUBLIC_*` as a literal, so the reference
 * below has to stay written out in full for the build to see it.
 */
export const exactMatchingEnabled = (): boolean => process.env.EXPO_PUBLIC_EXACT_MATCHING === "1";
