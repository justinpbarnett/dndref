import { describe, expect, it, vi } from "vitest";

// Settings reach react-native through the app-data store.
vi.mock("react-native", () => ({ Platform: { OS: "web", select: (choices: Record<string, unknown>) => choices.web } }));

import { createDefaultDataSourceSettings, mergeDataSourceSettings } from "./settings";

describe("mergeDataSourceSettings", () => {
  it("defaults a table with nothing stored to D&D", () => {
    expect(mergeDataSourceSettings(null).rulesetId).toBe("dnd");
    expect(mergeDataSourceSettings({}).rulesetId).toBe("dnd");
  });

  it("keeps a stored ruleset this build knows", () => {
    expect(mergeDataSourceSettings({ rulesetId: "mtg" }).rulesetId).toBe("mtg");
  });

  it("falls back rather than leaving the session on a ruleset nothing can load", () => {
    // A build that knew another game, or a hand-edited store.
    for (const stored of ["pathfinder", "", null, 7, undefined]) {
      const settings = mergeDataSourceSettings({ rulesetId: stored } as never);
      expect(settings.rulesetId, `${String(stored)} must fall back`).toBe("dnd");
    }
  });

  it("carries the rest of a stored setting through untouched", () => {
    const merged = mergeDataSourceSettings({ rulesetId: "mtg", kankaToken: "token", srdEnabled: false });

    expect(merged.kankaToken).toBe("token");
    expect(merged.srdEnabled).toBe(false);
    expect(merged.srdSources).toEqual(createDefaultDataSourceSettings().srdSources);
  });

  it("copies the source list so a merged settings object cannot mutate the defaults", () => {
    const merged = mergeDataSourceSettings({});
    merged.srdSources.push("a5e-srd");

    expect(createDefaultDataSourceSettings().srdSources).toEqual(["wotc-srd"]);
  });
});
