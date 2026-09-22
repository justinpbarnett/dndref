import { describe, expect, it, vi } from "vitest";

// The providers reach react-native through the proxy and upload modules.
vi.mock("react-native", () => ({ Platform: { OS: "web", select: (choices: Record<string, unknown>) => choices.web } }));

import { createDefaultDataSourceSettings, type DataSourcesSettings } from "../storage/settings";

import { ALL_RULESETS, RULESETS, rulesetFor } from "./index";

const settings = createDefaultDataSourceSettings;
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
});

describe("the D&D ruleset", () => {
  it("always loads the sample world and whatever was uploaded", () => {
    expect(providerNames({ srdEnabled: false })).toEqual(["Sample World", "Uploaded Files"]);
  });

  it("adds exactly one provider for each source that is configured", () => {
    const baseCount = providerNames({ srdEnabled: false }).length;
    const sourceSettings: Partial<DataSourcesSettings>[] = [
      { srdEnabled: true },
      { kankaToken: "token", kankaCampaignId: "1" },
      { homebreweryUrl: "https://homebrewery.naturalcrit.com/share/abc" },
      { notionToken: "secret", notionPageIds: "1ec3b2a45f6d80a9b1c2d3e4f5a6b7c8" },
      { googleDocsUrl: "https://docs.google.com/document/d/abc/edit" },
    ];

    for (const change of sourceSettings) {
      const added = providerNames({ srdEnabled: false, ...change }).length - baseCount;
      expect(added, `${Object.keys(change).join("+")} must add a provider`).toBe(1);
    }
  });

  it("needs both halves of a credential before it builds the source", () => {
    expect(providerNames({ srdEnabled: false, kankaToken: "token" })).toEqual(["Sample World", "Uploaded Files"]);
    expect(providerNames({ srdEnabled: false, notionToken: "secret" })).toEqual(["Sample World", "Uploaded Files"]);
  });

  it("answers in full, so nothing needs filling in afterwards", () => {
    expect(RULESETS.dnd.hydrate).toBeUndefined();
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

  it("keeps the D&D sources configured, so switching back restores them", () => {
    const configured = { ...settings(), rulesetId: "mtg" as const, googleDocsUrl: "https://docs.google.com/d/x/edit" };

    expect(providerNames(configured)).toEqual(["Scryfall"]);
    expect(providerNames({ ...configured, rulesetId: "dnd" })).toContain("Google Docs");
  });
});
