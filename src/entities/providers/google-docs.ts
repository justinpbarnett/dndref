import { EntityIndex, WorldDataProvider } from '../index';
import { MarkdownProvider } from './markdown';
import { CORS_PROXY } from '../../proxy';
import { handleCorsError } from '../../utils/providers';

const GDOCS_BASE = CORS_PROXY ? `${CORS_PROXY}/google-docs` : 'https://docs.google.com';

export class GoogleDocsProvider implements WorldDataProvider {
  readonly name = 'Google Docs';
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async load(): Promise<EntityIndex> {
    const docId = extractDocId(this.url);
    const exportUrl = `${GDOCS_BASE}/document/d/${docId}/export?format=txt`;
    let text: string;
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error(`Google Docs fetch failed: ${res.status}. Make sure the doc is shared with "Anyone with the link".`);
      text = await res.text();
    } catch (e) {
      throw handleCorsError(e, 'Google Docs', 'Use the iOS app or paste content via file upload.');
    }
    return new MarkdownProvider(text, 'Google Docs').load();
  }

  getName(): string { return this.name; }
}

function extractDocId(url: string): string {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return url.trim();
}
