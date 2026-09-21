import { fetchOutbound } from "../../proxy";
import { EntityIndex, WorldDataProvider } from "../index";
import { MarkdownProvider } from "./markdown";

export class HomebreweryProvider implements WorldDataProvider {
  readonly name = "Homebrewery";
  constructor(private url: string) {}

  async load(): Promise<EntityIndex> {
    const res = await fetchOutbound("homebrewery", `/api/brew/${extractBrewId(this.url)}`, {
      sourceName: this.name,
    });
    if (!res.ok) throw new Error(`Homebrewery fetch failed: ${res.status}`);

    const data = (await res.json()) as { text?: string; brew?: { text?: string } };
    const cleaned = stripBrewSyntax(data.text ?? data.brew?.text ?? "");
    return new MarkdownProvider(cleaned, this.name).load();
  }
}

function extractBrewId(input: string): string {
  const match = input.match(/(?:share|edit)\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return input.trim().split("/").pop() ?? input.trim();
}

const stripBrewSyntax = (text: string): string =>
  text
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/^:{2,}.*$/gm, "")
    .replace(/^={4,}$/gm, "")
    .replace(/\[\[.*?\]\]/g, "")
    .replace(/\\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
