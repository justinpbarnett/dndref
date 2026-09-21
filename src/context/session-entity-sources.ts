import type { DataSourcesSettings } from "../storage/app-data/data-source-settings-model";
import type { EntityIndex, WorldDataProvider } from "../entities/index";
import { FileUploadProvider } from "../entities/providers/file-upload";
import { GoogleDocsProvider } from "../entities/providers/google-docs";
import { HomebreweryProvider } from "../entities/providers/homebrewery";
import { KankaProvider } from "../entities/providers/kanka";
import { MarkdownProvider } from "../entities/providers/markdown";
import { extractNotionId, NotionProvider } from "../entities/providers/notion";
import { SRDProvider } from "../entities/providers/srd";
import { SAMPLE_WORLD } from "../sample-world/index";

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
