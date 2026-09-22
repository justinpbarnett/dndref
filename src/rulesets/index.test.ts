import { describe, expect, it, vi } from "vitest";

// The providers reach react-native through the proxy and upload modules.
vi.mock("react-native", () => ({ Platform: { OS: "web", select: (choices: Record<string, unknown>) => choices.web } }));

import { createDefaultDataSourceSettings, type DataSourcesSettings } from "../storage/settings";

import { ALL_RULESETS, RULESETS, rulesetFor, SOURCE_GROUP_IDS, type SourceGroupId } from "./index";

const settings = createDefaultDataSourceSettings;

/** What a table would have to fill in for Sources to have collected each group. */
const CONFIGURED: Record<SourceGroupId, Partial<DataSourcesSettings>> = {
  srd: { srdEnabled: true },
  kanka: { kankaToken: "token", kankaCampaignId: "1" },
  homebrewery: { homebreweryUrl: "https://homebrewery.naturalcrit.com/share/abc" },
  notion: { notionToken: "secret", notionPageIds: "1ec3b2a45f6d80a9b1c2d3e4f5a6b7c8" },
  googleDocs: { googleDocsUrl: "https://docs.google.com/document/d/abc/edit" },
  scryfall: {},
};
const providerNames = (patch: Partial<DataSourcesSettings> = {}) => {
  const configured = { ...settings(), ...patch };
  return rulesetFor(configured.rulesetId)
    .providers(configured)
    .map((provider) => provider.name);
};

describe("rulesets", () => {
  it("pairs each world with the matcher that world needs", () => {
    expect(RULESETS.dnd.matching).toBe("fuzzy");
    expect(RULESETS.mtg.matching).toBe("exact");
  });

  it("offers every ruleset the toggle can reach, in a stable order", () => {
    expect(ALL_RULESETS.map((ruleset) => ruleset.id)).toEqual(["dnd", "mtg"]);
    expect(ALL_RULESETS.map((ruleset) => ruleset.label)).toEqual(["D&D", "MTG"]);
  });

  it("falls back to D&D for an id this build does not have", () => {
    expect(rulesetFor("pathfinder").id).toBe("dnd");
    expect(rulesetFor(undefined).id).toBe("dnd");
  });

  it("names only source groups Sources knows how to render", () => {
    for (const ruleset of ALL_RULESETS) {
      for (const source of ruleset.sources) {
        expect(SOURCE_GROUP_IDS, `${ruleset.id} offers an unknown source group`).toContain(source);
      }
    }
  });

  it("offers a source group for every game, so no game reads as having no sources", () => {
    for (const ruleset of ALL_RULESETS) {
      expect(ruleset.sources.length, `${ruleset.id} offers nothing`).toBeGreaterThan(0);
    }
  });
});

describe("the D&D ruleset", () => {
  it("always loads the sample world and whatever was uploaded", () => {
    expect(providerNames({ srdEnabled: false })).toEqual(["Sample World", "Uploaded Files"]);
  });

  // Every group Sources offers has to reach a provider, or it is a field the
  // table fills in for nothing.
  it("adds exactly one provider for each source group it offers", () => {
    const baseCount = providerNames({ srdEnabled: false }).length;

    for (const source of RULESETS.dnd.sources) {
      const added = providerNames({ srdEnabled: false, ...CONFIGURED[source] }).length - baseCount;
      expect(added, `${source} must add a provider`).toBe(1);
    }
  });

  it("needs both halves of a credential before it builds the source", () => {
    expect(providerNames({ srdEnabled: false, kankaToken: "token" })).toEqual(["Sample World", "Uploaded Files"]);
    expect(providerNames({ srdEnabled: false, notionToken: "secret" })).toEqual(["Sample World", "Uploaded Files"]);
  });

  it("answers in full, so nothing needs filling in afterwards", () => {
    expect(RULESETS.dnd.hydrate).toBeUndefined();
  });

  it("offers every source it can build a provider from", () => {
    expect(RULESETS.dnd.sources).toEqual(["srd", "kanka", "homebrewery", "notion", "googleDocs"]);
  });
});

describe("the MTG ruleset", () => {
  it("loads Scryfall alone, so table talk cannot raise a campaign's notes", () => {
    expect(providerNames({ rulesetId: "mtg", srdEnabled: true, kankaToken: "t", kankaCampaignId: "1" })).toEqual([
      "Scryfall",
    ]);
  });

  it("fills its cards in later, because its index is names alone", () => {
    expect(RULESETS.mtg.hydrate).toBeTypeOf("function");
  });

  it("offers Scryfall alone, so Sources asks for nothing this game never reads", () => {
    expect(RULESETS.mtg.sources).toEqual(["scryfall"]);
  });

  it("keeps the D&D sources configured, so switching back restores them", () => {
    const configured = { ...settings(), rulesetId: "mtg" as const, googleDocsUrl: "https://docs.google.com/d/x/edit" };

    expect(providerNames(configured)).toEqual(["Scryfall"]);
    expect(providerNames({ ...configured, rulesetId: "dnd" })).toContain("Google Docs");
  });
});
