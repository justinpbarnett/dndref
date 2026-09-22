import { describe, expect, it } from "vitest";

import { dataSourcesSettingsKey } from "./session-entity-sources";
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

  it("changes when the table switches game, which is what reloads the world", () => {
    expect(dataSourcesSettingsKey({ ...settings(), rulesetId: "mtg" })).not.toBe(dataSourcesSettingsKey(settings()));
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
});
