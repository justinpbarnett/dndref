import type { EntityType } from "./entities";
import type { Colors } from "./color-types";

export const typeAccent = (type: EntityType, colors: Colors): string =>
  ({
    Location: colors.location,
    NPC: colors.npc,
    Faction: colors.faction,
    Item: colors.item,
    Unknown: colors.unknown,
  })[type];
