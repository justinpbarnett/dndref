import { EntityIndex, WorldDataProvider } from '../index';
import { MarkdownProvider } from './markdown';
import { handleCorsError } from '../../utils/providers';

export class HomebreweryProvider implements WorldDataProvider {
  readonly name = 'Homebrewery';
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async load(): Promise<EntityIndex> {
    const id = extractBrewId(this.url);
    let text: string;
    try {
      const res = await fetch(`https://homebrewery.naturalcrit.com/api/brew/${id}`);
      if (!res.ok) throw new Error(`Homebrewery fetch failed: ${res.status}`);
      const data = await res.json() as { text?: string; brew?: { text?: string } };
      text = data.text ?? data.brew?.text ?? '';
    } catch (e) {
      throw handleCorsError(e, 'Homebrewery', 'Use the iOS app or paste content via file upload.');
    }
    const cleaned = stripBrewSyntax(text);
    return new MarkdownProvider(cleaned, 'Homebrewery').load();
  }

  getName(): string { return this.name; }
}

function extractBrewId(input: string): string {
  const match = input.match(/(?:share|edit)\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // Bare ID or unknown format -- return as-is
  return input.trim().split('/').pop() ?? input.trim();
}

function stripBrewSyntax(text: string): string {
  return text
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/^:{2,}.*$/gm, '')
    .replace(/^={4,}$/gm, '')
    .replace(/\[\[.*?\]\]/g, '')
    .replace(/\\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
