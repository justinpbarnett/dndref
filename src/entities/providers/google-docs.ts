import { fetchUpstream, upstreamUrl } from "../../proxy";
import { EntityIndex, WorldDataProvider } from "../index";
import { ingestMarkdownContent } from "../ingestion";

const GOOGLE_DOCS_SOURCE_NAME = "Google Docs";

export class GoogleDocsProvider implements WorldDataProvider {
  readonly name = GOOGLE_DOCS_SOURCE_NAME;
  constructor(private readonly url: string) {}

  async load(): Promise<EntityIndex> {
    const text = await fetchGoogleDocText(this.url);
    return ingestMarkdownContent(text);
  }
}

export async function fetchGoogleDocText(urlOrId: string): Promise<string> {
  const response = await fetchUpstream("google-docs", googleDocsExportPath(urlOrId), {
    sourceName: GOOGLE_DOCS_SOURCE_NAME,
  });
  if (!response.ok) {
    throw new Error(
      `Google Docs fetch failed: ${response.status}. Make sure the doc is shared with "Anyone with the link".`,
    );
  }

  return await response.text();
}

const googleDocsExportPath = (urlOrId: string) => `/document/d/${extractGoogleDocId(urlOrId)}/export?format=txt`;

export const buildGoogleDocsExportUrl = (urlOrId: string): string =>
  upstreamUrl("google-docs", googleDocsExportPath(urlOrId));

export function extractGoogleDocId(urlOrId: string): string {
  const match = urlOrId.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return urlOrId.trim();
}
