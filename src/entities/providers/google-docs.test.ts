import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.hoisted(() => vi.fn());
const ingestionMocks = vi.hoisted(() => ({
  ingestMarkdownContent: vi.fn(),
}));

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('../ingestion', () => ingestionMocks);

import { ingestMarkdownContent } from '../ingestion';
import {
  buildGoogleDocsExportUrl,
  fetchGoogleDocText,
  GoogleDocsProvider,
} from './google-docs';

const mockedIngestMarkdownContent = vi.mocked(ingestMarkdownContent);

describe('GoogleDocsProvider', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    mockedIngestMarkdownContent.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the exported document text through the browser CORS proxy', async () => {
    fetchMock.mockResolvedValue(textResponse('# Moonlit Bazaar'));

    await expect(fetchGoogleDocText('https://docs.google.com/document/d/doc_123/edit'))
      .resolves.toBe('# Moonlit Bazaar');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.dndref.com/google-docs/document/d/doc_123/export?format=txt',
    );
  });

  it('builds direct Google Docs export URLs for native callers', () => {
    const documentUrl = 'https://docs.google.com/document/d/doc_123/edit#heading=h.1';

    expect(buildGoogleDocsExportUrl(documentUrl, null))
      .toBe('https://docs.google.com/document/d/doc_123/export?format=txt');
    expect(buildGoogleDocsExportUrl('doc_123', null))
      .toBe('https://docs.google.com/document/d/doc_123/export?format=txt');
  });

  it('loads fetched document text through shared ingestion', async () => {
    const documentText = `
## Moonlit Bazaar
Type: place
Aliases: Night Market

Open only under the new moon.
`;
    const ingestedEntities = [{
      id: 'moonlit-bazaar',
      name: 'Moonlit Bazaar',
      type: 'Location' as const,
      aliases: ['Night Market'],
      summary: 'Open only under the new moon.',
    }];
    fetchMock.mockResolvedValue(textResponse(documentText));
    mockedIngestMarkdownContent.mockReturnValue(ingestedEntities);

    const entities = await new GoogleDocsProvider(
      'https://docs.google.com/document/d/doc_123/edit',
    ).load();

    expect(mockedIngestMarkdownContent).toHaveBeenCalledOnce();
    expect(mockedIngestMarkdownContent).toHaveBeenCalledWith(documentText);
    expect(entities).toBe(ingestedEntities);
  });

  it('surfaces failed public document exports through the provider failure path', async () => {
    fetchMock.mockResolvedValue(textResponse('', 403));

    await expect(new GoogleDocsProvider('doc_123').load())
      .rejects.toThrow('Google Docs fetch failed: 403');
    expect(mockedIngestMarkdownContent).not.toHaveBeenCalled();
  });

  it('keeps browser CORS errors on the existing user-friendly path', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchGoogleDocText('doc_123'))
      .rejects.toThrow('Cannot reach Google Docs from the browser (CORS). Use the iOS app or paste content via file upload.');
  });
});

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}
