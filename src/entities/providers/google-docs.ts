import { CORS_PROXY } from '../../proxy';
import { handleCorsError } from '../../utils/providers';
import { EntityIndex, WorldDataProvider } from '../index';
import { ingestMarkdownContent } from '../ingestion';

const GOOGLE_DOCS_ORIGIN = 'https://docs.google.com';
const GOOGLE_DOCS_PROXY_PATH = '/google-docs';
const GOOGLE_DOCS_SOURCE_NAME = 'Google Docs';
const GOOGLE_DOCS_SHARE_HINT = 'Make sure the doc is shared with "Anyone with the link".';
const GOOGLE_DOCS_CORS_FALLBACK = 'Use the iOS app or paste content via file upload.';

export class GoogleDocsProvider implements WorldDataProvider {
  readonly name = GOOGLE_DOCS_SOURCE_NAME;
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  async load(): Promise<EntityIndex> {
    const text = await fetchGoogleDocText(this.url);
    return ingestMarkdownContent(text);
  }

  getName(): string { return this.name; }
}

export async function fetchGoogleDocText(urlOrId: string): Promise<string> {
  const exportUrl = buildGoogleDocsExportUrl(urlOrId);

  try {
    const response = await fetch(exportUrl);
    if (!response.ok) {
      throw new Error(`Google Docs fetch failed: ${response.status}. ${GOOGLE_DOCS_SHARE_HINT}`);
    }

    return await response.text();
  } catch (error) {
    throw handleCorsError(error, GOOGLE_DOCS_SOURCE_NAME, GOOGLE_DOCS_CORS_FALLBACK);
  }
}

export function buildGoogleDocsExportUrl(urlOrId: string, corsProxy: string | null = CORS_PROXY): string {
  const docId = extractGoogleDocId(urlOrId);
  const baseUrl = corsProxy ? `${corsProxy}${GOOGLE_DOCS_PROXY_PATH}` : GOOGLE_DOCS_ORIGIN;
  return `${baseUrl}/document/d/${docId}/export?format=txt`;
}

export function extractGoogleDocId(urlOrId: string): string {
  const match = urlOrId.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return urlOrId.trim();
}
