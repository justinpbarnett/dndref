/**
 * Which way the detector matches a transcript against the world.
 *
 * Fuzzy matching suits a campaign, where names are unusual enough that a near
 * miss is still the right entity. It does not suit a world whose names are
 * ordinary English -- a Magic card index, say -- where "she might come by"
 * fuzzily matches Mightstone and Comeuppance and the stack fills with noise.
 *
 * This is a prototype switch, so it is read at build time rather than offered
 * in settings. Build it either way with `just build-web-exact` or
 * `just build-web-fuzzy`, which clear Metro's cache -- that cache does not key
 * on EXPO_PUBLIC_* vars, so setting this in front of a plain `just build-web`
 * silently returns whichever mode was built last.
 *
 * Metro inlines `process.env.EXPO_PUBLIC_*` as a literal, so the reference
 * below has to stay written out in full for the build to see it.
 */
export const exactMatchingEnabled = (): boolean => process.env.EXPO_PUBLIC_EXACT_MATCHING === "1";
