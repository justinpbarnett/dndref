/**
 * Filling in entities a source could only name.
 *
 * Most world sources answer in full: a Kanka character or a markdown note
 * arrives with its text already attached. A card index does not. Scryfall's
 * names catalog is 35k names and nothing else, because the file that carries
 * the text as well is a hundred times larger than a session should download.
 *
 * So the text is fetched for the cards that reached the stack, and only for
 * those. That keeps the cost proportional to what a table looks at. A name is
 * asked about once: the answer is kept, so a card dismissed and named again
 * comes back filled without a second request, and a name that came back empty
 * is not asked about again on the next pass.
 *
 * Nothing here blocks detection. Cards appear the moment they are detected and
 * fill in when the answer arrives, which is why a failed request is a warning
 * and not an error -- a card showing only its name still tells a player that
 * the name was said.
 */
import type { SessionRuntimeSnapshot, SessionRuntimeSnapshotPatch } from "./runtime-types";
import type { Entity } from "../../entities/index";

export type EntityHydrator = (entities: Entity[]) => Promise<Entity[]>;

type RuntimeEntityHydrationOptions = {
  getSnapshot: () => SessionRuntimeSnapshot;
  updateSnapshot: (patch: SessionRuntimeSnapshotPatch) => void;
};

export class RuntimeEntityHydration {
  private hydrate: EntityHydrator | null = null;
  private readonly filled = new Map<string, Entity>();
  private readonly asked = new Set<string>();

  constructor(private readonly options: RuntimeEntityHydrationOptions) {}

  /** A new hydrator means a new world, so nothing learned about the old one carries over. */
  setHydrator = (hydrate: EntityHydrator | null): void => {
    this.hydrate = hydrate;
    this.filled.clear();
    this.asked.clear();
  };

  async fill(entities: Entity[]): Promise<void> {
    const hydrate = this.hydrate;
    if (!hydrate) return;

    this.applyToCards();

    const wanted = entities.filter((entity) => this.needsFilling(entity));
    if (wanted.length === 0) return;
    for (const entity of wanted) this.asked.add(entity.id);

    let hydrated: Entity[];
    try {
      hydrated = await hydrate(wanted);
    } catch (e) {
      // Let a later pass try again: the table is still running, and the next
      // time one of these names is said the network may be back.
      for (const entity of wanted) this.asked.delete(entity.id);
      console.warn("[dnd-ref] Could not fill in entity details:", e);
      return;
    }

    for (const entity of hydrated) if (entity.summary) this.filled.set(entity.id, entity);
    this.applyToCards();
  }

  private needsFilling = (entity: Entity): boolean =>
    !entity.summary && !this.filled.has(entity.id) && !this.asked.has(entity.id);

  private applyToCards(): void {
    if (this.filled.size === 0) return;

    const { cards } = this.options.getSnapshot();
    let changed = false;
    const nextCards = cards.map((card) => {
      const entity = this.filled.get(card.entity.id);
      if (!entity || entity === card.entity) return card;
      changed = true;
      return { ...card, entity };
    });

    if (changed) this.options.updateSnapshot({ cards: nextCards });
  }
}
