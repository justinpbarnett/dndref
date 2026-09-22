import type { DataSourcesSettings } from "../storage/settings";
import type { EntityIndex, WorldDataProvider } from "../entities/index";
import { FileUploadProvider } from "../entities/providers/file-upload";
import { GoogleDocsProvider } from "../entities/providers/google-docs";
import { HomebreweryProvider } from "../entities/providers/homebrewery";
import { KankaProvider } from "../entities/providers/kanka";
import { MarkdownProvider } from "../entities/providers/markdown";
import { extractNotionId, NotionProvider } from "../entities/providers/notion";
import { SRDProvider } from "../entities/providers/srd";
import { SAMPLE_WORLD } from "../sample-world/index";

/**
 * One value that changes whenever the settings do. `SessionProvider` reloads the
 * entity index on this, in place of naming in a dependency array each field
 * `buildWorldDataProviders` reads.
 *
 * Every field counts, including the ones no provider is built from. Listing the
 * sources, or listing the exceptions, would put a second copy of that knowledge
 * here for a maintainer to keep in step with the builder below. There is no list,
 * so a new data source needs no edit in this function and cannot be forgotten.
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

export function buildWorldDataProviders(settings: DataSourcesSettings): WorldDataProvider[] {
  const providers: WorldDataProvider[] = [new MarkdownProvider(SAMPLE_WORLD, "Sample World"), new FileUploadProvider()];
  if (settings.srdEnabled) providers.push(new SRDProvider(settings.srdSources));
  if (settings.kankaToken && settings.kankaCampaignId) {
    providers.push(new KankaProvider(settings.kankaToken, Number(settings.kankaCampaignId)));
  }
  if (settings.homebreweryUrl) providers.push(new HomebreweryProvider(settings.homebreweryUrl));
  const notionPageIds = parseNotionPageIds(settings.notionPageIds);
  if (settings.notionToken && notionPageIds.length > 0) providers.push(new NotionProvider(settings.notionToken, notionPageIds));
  if (settings.googleDocsUrl) providers.push(new GoogleDocsProvider(settings.googleDocsUrl));
  return providers;
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

function parseNotionPageIds(value: string): string[] {
  return value
    .split(",")
    .map((pageId) => extractNotionId(pageId.trim()))
    .filter(Boolean);
}
