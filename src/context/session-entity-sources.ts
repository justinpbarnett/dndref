import type { EntityIndex, WorldDataProvider } from "../entities/index";
import type { DataSourcesSettings } from "../storage/settings";

/**
 * One value that changes whenever the settings do. `SessionProvider` reloads the
 * entity index on this, in place of naming in a dependency array each field the
 * active ruleset builds its providers from.
 *
 * Every field counts, including the ones no provider is built from. Listing the
 * sources, or listing the exceptions, would put a second copy of that knowledge
 * here for a maintainer to keep in step with the rulesets. There is no list, so
 * a new data source needs no edit in this function and cannot be forgotten.
 *
 * The price is a reload the index did not need: saving a changed `aiApiKey` and
 * nothing else refetches every source. That costs one round of requests on an
 * explicit save. The failure it rules out is the opposite one, where a source the
 * key does not know about leaves the table running on a stale world.
 */
export function dataSourcesSettingsKey(settings: DataSourcesSettings): string {
  const entries = Object.entries(settings).sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify(entries);
}

export async function loadEntityIndex(providers: WorldDataProvider[]): Promise<EntityIndex> {
  const results = await Promise.allSettled(providers.map((provider) => provider.load()));
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn(`[dnd-ref] ${providers[index].name} failed to load:`, result.reason);
    }
  });
  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}
