import { describe, expect, it, vi } from "vitest";

// The providers reach react-native through the proxy and upload modules.
vi.mock("react-native", () => ({ Platform: { OS: "web", select: (choices: Record<string, unknown>) => choices.web } }));

import { buildWorldDataProviders, dataSourcesSettingsKey } from "./session-entity-sources";
import { createDefaultDataSourceSettings, type DataSourcesSettings } from "../storage/settings";

const settings = createDefaultDataSourceSettings;

/** A different value of the same shape, whatever the field holds. */
const altered = (value: DataSourcesSettings[keyof DataSourcesSettings]) => {
  if (typeof value === "boolean") return !value;
  if (Array.isArray(value)) return [...value, "another-source"];
  return `${value}-changed`;
};

describe("dataSourcesSettingsKey", () => {
  it("changes when a setting the providers are built from changes", () => {
    const before = dataSourcesSettingsKey(settings());

    expect(dataSourcesSettingsKey({ ...settings(), kankaToken: "token" })).not.toBe(before);
    expect(dataSourcesSettingsKey({ ...settings(), srdEnabled: false })).not.toBe(before);
    expect(dataSourcesSettingsKey({ ...settings(), srdSources: ["a5e-srd"] })).not.toBe(before);
  });

  it("holds steady across equal settings so the entity index is not reloaded", () => {
    expect(dataSourcesSettingsKey(settings())).toBe(dataSourcesSettingsKey(settings()));
  });

  it("changes for a setting no provider reads, which is the price of keeping no list", () => {
    expect(dataSourcesSettingsKey({ ...settings(), aiApiKey: "sk-changed" })).not.toBe(
      dataSourcesSettingsKey(settings()),
    );
  });

  it("reflects every settings field, so a data source added later needs no edit here", () => {
    const base = settings();
    const fields = Object.keys(base) as (keyof DataSourcesSettings)[];

    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) {
      const changed = { ...base, [field]: altered(base[field]) };
      expect(dataSourcesSettingsKey(changed), `${field} must change the key`).not.toBe(dataSourcesSettingsKey(base));
    }
  });

  it("changes for each setting that adds a provider", () => {
    const base = settings();
    const baseCount = buildWorldDataProviders(base).length;
    const sourceSettings: Partial<DataSourcesSettings>[] = [
      { kankaToken: "token", kankaCampaignId: "1" },
      { homebreweryUrl: "https://homebrewery.naturalcrit.com/share/abc" },
      { notionToken: "secret", notionPageIds: "1ec3b2a45f6d80a9b1c2d3e4f5a6b7c8" },
      { googleDocsUrl: "https://docs.google.com/document/d/abc/edit" },
    ];

    for (const change of sourceSettings) {
      const configured = { ...base, ...change };
      const added = buildWorldDataProviders(configured).length - baseCount;

      expect(added, `${Object.keys(change).join("+")} must add a provider`).toBe(1);
      expect(dataSourcesSettingsKey(configured)).not.toBe(dataSourcesSettingsKey(base));
    }
  });
});
