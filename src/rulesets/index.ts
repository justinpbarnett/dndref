/**
 * A ruleset: the game the table is playing, and everything that follows from it.
 *
 * Which world to load and how to match speech against it are not two settings
 * that happen to sit near each other. They are one decision. A Magic index is
 * 35k names in ordinary English, and fuzzy matching against it fills the stack
 * with cards nobody said. A campaign's names are invented, and exact matching
 * against them drops every name the microphone slightly mangles. Picking the
 * world and picking the matcher separately is picking a way to get it wrong, so
 * the toggle in the Reference tab picks one of these instead.
 *
 * Adding a third game is one entry in `RULESETS` plus its id in `./id.ts`.
 */
import { DEFAULT_RULESET_ID, RULESET_IDS, type RulesetId } from "./id";
import type { MatchingMode } from "../entities/detection-mode";
import type { Entity, WorldDataProvider } from "../entities/index";
import { FileUploadProvider } from "../entities/providers/file-upload";
import { GoogleDocsProvider } from "../entities/providers/google-docs";
import { HomebreweryProvider } from "../entities/providers/homebrewery";
import { KankaProvider } from "../entities/providers/kanka";
import { MarkdownProvider } from "../entities/providers/markdown";
import { extractNotionId, NotionProvider } from "../entities/providers/notion";
import { hydrateScryfallCards, ScryfallProvider } from "../entities/providers/scryfall";
import { SRDProvider } from "../entities/providers/srd";
import { SAMPLE_WORLD } from "../sample-world/index";
import type { DataSourcesSettings } from "../storage/settings";

export { DEFAULT_RULESET_ID, isRulesetId, RULESET_IDS, type RulesetId } from "./id";

export type Ruleset = {
  readonly id: RulesetId;
  /** What the toggle calls it. */
  readonly label: string;
  readonly matching: MatchingMode;
  providers(settings: DataSourcesSettings): WorldDataProvider[];
  /**
   * Fills in entities a source could only name. Present on a ruleset whose index
   * is names alone, absent on one whose sources already answer in full.
   */
  hydrate?(entities: Entity[]): Promise<Entity[]>;
};

const dnd: Ruleset = {
  id: "dnd",
  label: "D&D",
  matching: "fuzzy",
  providers(settings) {
    const providers: WorldDataProvider[] = [
      new MarkdownProvider(SAMPLE_WORLD, "Sample World"),
      new FileUploadProvider(),
    ];
    if (settings.srdEnabled) providers.push(new SRDProvider(settings.srdSources));
    if (settings.kankaToken && settings.kankaCampaignId) {
      providers.push(new KankaProvider(settings.kankaToken, Number(settings.kankaCampaignId)));
    }
    if (settings.homebreweryUrl) providers.push(new HomebreweryProvider(settings.homebreweryUrl));
    const notionPageIds = parseNotionPageIds(settings.notionPageIds);
    if (settings.notionToken && notionPageIds.length > 0) {
      providers.push(new NotionProvider(settings.notionToken, notionPageIds));
    }
    if (settings.googleDocsUrl) providers.push(new GoogleDocsProvider(settings.googleDocsUrl));
    return providers;
  },
};

/**
 * Scryfall alone, and none of the D&D sources.
 *
 * A campaign's notes and a card index share no names worth matching, and every
 * entity the other sources add is one more chance for table talk to raise
 * something from the wrong game. The sources configured in Settings are not
 * lost, only unused: switching back to D&D loads them again.
 */
const mtg: Ruleset = {
  id: "mtg",
  label: "MTG",
  matching: "exact",
  providers: () => [new ScryfallProvider()],
  hydrate: hydrateScryfallCards,
};

export const RULESETS: Record<RulesetId, Ruleset> = { dnd, mtg };

export const ALL_RULESETS: Ruleset[] = RULESET_IDS.map((id) => RULESETS[id]);

/** The ruleset an id names, falling back rather than throwing on a stored id this build no longer has. */
export const rulesetFor = (id: unknown): Ruleset =>
  (typeof id === "string" ? RULESETS[id as RulesetId] : undefined) ?? RULESETS[DEFAULT_RULESET_ID];

function parseNotionPageIds(value: string): string[] {
  return value
    .split(",")
    .map((pageId) => extractNotionId(pageId.trim()))
    .filter(Boolean);
}
