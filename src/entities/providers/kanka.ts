import { fetchAll } from "../../utils/providers";
import { Entity, EntityIndex, EntityType, WorldDataProvider, stripHtml } from "../index";
import { normalizeIngestedEntity } from "../ingestion";

type KankaResourceType = "characters" | "locations" | "organisations" | "items";

const TYPE_MAP: Record<KankaResourceType, EntityType> = {
  characters: "NPC",
  locations: "Location",
  organisations: "Faction",
  items: "Item",
};

export class KankaProvider implements WorldDataProvider {
  readonly name = "Kanka";
  constructor(
    private token: string,
    private campaignId: number,
  ) {}

  async load(): Promise<EntityIndex> {
    const types: KankaResourceType[] = ["characters", "locations", "organisations", "items"];
    const results = await Promise.all(types.map((t) => this.fetchType(t)));
    return results.flat();
  }

  private async fetchType(resource: KankaResourceType): Promise<Entity[]> {
    const entityType = TYPE_MAP[resource];
    const items = await fetchAll(
      `https://api.kanka.io/1.0/campaigns/${this.campaignId}/${resource}`,
      (data) => data.links?.next ?? null,
      {
        headers: { Authorization: `Bearer ${this.token}` },
      },
    );
    return items.flatMap((item: any): Entity[] => {
      const entity = normalizeIngestedEntity(
        {
          ...item,
          type: entityType,
          summary: stripHtml(item.entry ?? "").slice(0, 300),
          image: item.has_custom_image ? item.image_thumb : undefined,
        },
        { id: `kanka-${resource}-${item.id}` },
      );
      return entity ? [entity] : [];
    });
  }
}
