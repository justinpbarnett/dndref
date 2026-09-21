import { Entity, stripHtml } from "../../index";
import { normalizeIngestedEntity } from "../../ingestion";

export function monsterToEntity(m: any): Entity | null {
  const statSummary = [
    ["STR", m.strength],
    ["DEX", m.dexterity],
    ["CON", m.constitution],
    ["INT", m.intelligence],
    ["WIS", m.wisdom],
    ["CHA", m.charisma],
  ]
    .map(([label, value]) => `${label} ${value ?? "?"}`)
    .join(" ");
  const summary = `CR ${m.challenge_rating ?? "?"} · ${m.size ?? ""} ${m.type ?? ""}. AC ${m.armor_class ?? "?"}, HP ${m.hit_points ?? "?"}. ${statSummary}.`;
  return normalizeIngestedEntity(
    { ...m, type: "NPC", summary: summary.trim(), image: m.img_main },
    { id: m.slug ? `srd-monster-${m.slug}` : undefined, idPrefix: "srd-monster" },
  );
}

export function itemToEntity(item: any): Entity | null {
  const rarity = item.rarity ? item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1) : "";
  const desc = stripHtml(item.desc ?? "");
  const details = [rarity, desc].filter(Boolean).join(". ");
  const summary = [rarity, desc.slice(0, 200)].filter(Boolean).join(". ");
  return normalizeIngestedEntity(
    { ...item, type: "Item", summary, details },
    { id: item.slug ? `srd-item-${item.slug}` : undefined, idPrefix: "srd-item" },
  );
}
