import { Entity, slugify, stripHtml } from "../../index";

export function monsterToEntity(m: any): Entity {
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
  return {
    id: `srd-monster-${m.slug ?? slugify(m.name)}`,
    name: m.name,
    type: "NPC",
    aliases: [],
    summary: summary.trim(),
    image: m.img_main ?? undefined,
  };
}

export function itemToEntity(item: any): Entity {
  const rarity = item.rarity ? item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1) : "";
  const desc = stripHtml(item.desc ?? "");
  const details = [rarity, desc].filter(Boolean).join(". ");
  const summary = [rarity, desc.slice(0, 200)].filter(Boolean).join(". ");
  return {
    id: `srd-item-${item.slug ?? slugify(item.name)}`,
    name: item.name,
    type: "Item",
    aliases: [],
    summary,
    details,
  };
}
