import { Entity, EntityIndex, EntityType, WorldDataProvider, stripHtml } from '../index';

const KANKA_BASE = 'https://api.kanka.io/1.0';

type KankaResourceType = 'characters' | 'locations' | 'organisations' | 'items';

const TYPE_MAP: Record<KankaResourceType, EntityType> = {
  characters: 'NPC',
  locations: 'Location',
  organisations: 'Faction',
  items: 'Item',
};

export interface KankaCampaign {
  id: number;
  name: string;
}

export async function listKankaCampaigns(token: string): Promise<KankaCampaign[]> {
  const res = await fetch(`${KANKA_BASE}/campaigns`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Kanka: campaigns fetch failed (${res.status})`);
  const data = await res.json() as { data: KankaCampaign[] };
  return data.data;
}

export class KankaProvider implements WorldDataProvider {
  readonly name = 'Kanka';
  private token: string;
  private campaignId: number;

  constructor(token: string, campaignId: number) {
    this.token = token;
    this.campaignId = campaignId;
  }

  async load(): Promise<EntityIndex> {
    const types: KankaResourceType[] = ['characters', 'locations', 'organisations', 'items'];
    const results = await Promise.all(types.map((t) => this.fetchType(t)));
    return results.flat();
  }

  getName(): string { return this.name; }

  private async fetchType(resource: KankaResourceType): Promise<Entity[]> {
    const entityType = TYPE_MAP[resource];
    const items = await fetchAll(
      `${KANKA_BASE}/campaigns/${this.campaignId}/${resource}`,
      this.token,
    );
    return items.map((item: any): Entity => ({
      id: `kanka-${resource}-${item.id}`,
      name: item.name ?? 'Unknown',
      type: entityType,
      aliases: [],
      summary: stripHtml(item.entry ?? '').slice(0, 300),
      image: item.has_custom_image ? (item.image_thumb ?? undefined) : undefined,
    }));
  }
}

async function fetchAll(url: string, token: string): Promise<any[]> {
  const results: any[] = [];
  let next: string | null = url;
  while (next) {
    const res = await fetch(next, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Kanka: fetch failed (${res.status}) ${next}`);
    const data = await res.json() as { data: any[]; links: { next: string | null } };
    results.push(...data.data);
    next = data.links?.next ?? null;
  }
  return results;
}

