import { CORS_PROXY } from '../../proxy';
import { handleCorsError } from '../../utils/providers';
import { EntityIndex, WorldDataProvider } from '../index';
import { ingestMarkdownContent } from '../ingestion';

const GOOGLE_DOCS_ORIGIN = 'https://docs.google.com';
const GOOGLE_DOCS_PROXY_PATH = '/google-docs';
const GOOGLE_DOCS_SOURCE_NAME = 'Google Docs';

export class GoogleDocsProvider implements WorldDataProvider {
  readonly name = 'Google Docs';
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async load(): Promise<EntityIndex> {
    const text = await fetchGoogleDocText(this.url);
    return ingestMarkdownContent(text);
  }

  getName(): string { return this.name; }
}

export async function fetchGoogleDocText(url: string): Promise<string> {
  const exportUrl = buildGoogleDocsExportUrl(url);
  try {
    const res = await fetch(exportUrl);
    if (!res.ok) throw new Error(`Google Docs fetch failed: ${res.status}. Make sure the doc is shared with "Anyone with the link".`);
    return await res.text();
  } catch (e) {
    throw handleCorsError(e, GOOGLE_DOCS_SOURCE_NAME, 'Use the iOS app or paste content via file upload.');
  }
}

export function buildGoogleDocsExportUrl(url: string, corsProxy: string | null = CORS_PROXY): string {
  const docId = extractGoogleDocId(url);
  const baseUrl = corsProxy ? `${corsProxy}${GOOGLE_DOCS_PROXY_PATH}` : GOOGLE_DOCS_ORIGIN;
  return `${baseUrl}/document/d/${docId}/export?format=txt`;
}

export function extractGoogleDocId(url: string): string {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return url.trim();
}
