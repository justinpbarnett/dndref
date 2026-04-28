import { CORS_PROXY } from "../../../proxy";
import { handleCorsError } from "../../../utils/providers";
import { EntityIndex, WorldDataProvider } from "../../index";
import { ingestMarkdownContent } from "../../ingestion";

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
  const exportUrl = buildGoogleDocsExportUrl(urlOrId);

  try {
    const response = await fetch(exportUrl);
    if (!response.ok) {
      throw new Error(
        `Google Docs fetch failed: ${response.status}. Make sure the doc is shared with "Anyone with the link".`,
      );
    }

    return await response.text();
  } catch (error) {
    throw handleCorsError(error, GOOGLE_DOCS_SOURCE_NAME, "Use the iOS app or paste content via file upload.");
  }
}

export function buildGoogleDocsExportUrl(urlOrId: string, corsProxy: string | null = CORS_PROXY): string {
  const docId = extractGoogleDocId(urlOrId);
  const baseUrl = corsProxy ? `${corsProxy}/google-docs` : "https://docs.google.com";
  return `${baseUrl}/document/d/${docId}/export?format=txt`;
}

export function extractGoogleDocId(urlOrId: string): string {
  const match = urlOrId.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return urlOrId.trim();
}
