/**
 * Magic's card index, from Scryfall.
 *
 * Scryfall publishes every card as a bulk file, and at roughly 150MB no browser
 * should fetch one at the start of a session. This loads the names catalog
 * instead: 35k names in about 700KB, one request, and exactly the corpus the
 * exact matcher was measured against (see `exact-detection.ts`). That is enough
 * to detect a card, because detection only ever reads names and aliases.
 *
 * A name alone cannot fill a card face, so the text arrives on the second trip.
 * `hydrateScryfallCards` fetches it for the handful of cards actually on the
 * stack, which keeps the cost proportional to what a table looks at rather than
 * to the size of Magic. Up to 75 cards come back per request, so a full stack
 * costs one.
 *
 * Unlike every other remote source here, Scryfall answers the browser directly:
 * it sends `access-control-allow-origin: *`, so there is no route for it in
 * `src/proxy-routes.ts` and no Worker deploy behind a change to this file.
 *
 * Nothing is cached in app storage. The catalog is a single GET that Scryfall
 * marks cacheable, so the platform's own HTTP cache already answers the repeat.
 * Holding 35k entities in AsyncStorage would spend several megabytes of a quota
 * measured in single digits to save a request the browser was going to skip.
 */
import { handleCorsError } from "../../utils/providers";
import { Entity, EntityIndex, WorldDataProvider } from "../index";
import { normalizeIngestedEntity } from "../ingestion/normalization";

const SCRYFALL = "https://api.scryfall.com";
const SOURCE_NAME = "Scryfall";

/** The cap Scryfall puts on one `/cards/collection` request. */
const COLLECTION_BATCH = 75;

type ScryfallCatalog = { data?: unknown };
type ScryfallFace = { name?: unknown; oracle_text?: unknown; mana_cost?: unknown; image_uris?: unknown };
type ScryfallCard = ScryfallFace & {
  type_line?: unknown;
  flavor_text?: unknown;
  card_faces?: unknown;
};

export class ScryfallProvider implements WorldDataProvider {
  readonly name = SOURCE_NAME;

  async load(): Promise<EntityIndex> {
    const catalog = await getJson<ScryfallCatalog>("/catalog/card-names");
    const names = Array.isArray(catalog.data) ? catalog.data : [];

    return names
      .filter((name): name is string => typeof name === "string")
      .map(catalogEntity)
      .filter((entity): entity is Entity => entity !== null);
  }
}

/**
 * One card, named the way a player says it.
 *
 * The catalog spells a multi-faced card "Delver of Secrets // Insectile
 * Aberration": 969 of its 35k names carry a `//`, and only 69 of those front
 * faces are listed separately. Kept whole, such a name is unsayable, so the
 * card could never be detected, and `/cards/collection` rejects the combined
 * spelling, so it could never be filled in either. The front face becomes the
 * name and the other faces become aliases, which detection reads just the same
 * and which leaves a name Scryfall will answer to.
 */
function catalogEntity(name: string, index: number): Entity | null {
  const [front, ...backs] = name.split("//").map((face) => face.trim()).filter(Boolean);
  if (!front) return null;

  return normalizeIngestedEntity({ name: front, aliases: backs }, { idPrefix: "mtg", index });
}

/**
 * The same cards, with their rules text filled in.
 *
 * Every entity is returned whether or not Scryfall knew it, and a card it could
 * not fill comes back untouched rather than missing, so a caller can swap the
 * result in wholesale. A failed request is not an error either: the table is
 * mid-session and a card showing only its name still tells a player that the
 * name was said.
 */
export async function hydrateScryfallCards(entities: Entity[]): Promise<Entity[]> {
  const wanted = entities.filter((entity) => !entity.summary);
  if (wanted.length === 0) return entities;

  const cards = await fetchCards(wanted.map((entity) => entity.name));
  if (cards.size === 0) return entities;

  return entities.map((entity) => {
    const card = cards.get(matchKey(entity.name));
    return card ? { ...entity, ...describeCard(card) } : entity;
  });
}

async function fetchCards(names: string[]): Promise<Map<string, ScryfallCard>> {
  const found = new Map<string, ScryfallCard>();

  for (let start = 0; start < names.length; start += COLLECTION_BATCH) {
    const identifiers = names.slice(start, start + COLLECTION_BATCH).map((name) => ({ name }));
    let batch: { data?: unknown };
    try {
      batch = await postJson<{ data?: unknown }>("/cards/collection", { identifiers });
    } catch (e) {
      console.warn(`[dnd-ref] ${SOURCE_NAME} could not fill in card text:`, e);
      return found;
    }

    for (const card of Array.isArray(batch.data) ? batch.data : []) {
      if (card === null || typeof card !== "object") continue;
      // A card is keyed under every name it answers to. Scryfall returns a
      // multi-faced card under its combined name while the entity is named
      // after the front face alone, so the faces have to be keys too.
      for (const name of cardNames(card as ScryfallCard)) found.set(matchKey(name), card as ScryfallCard);
    }
  }

  return found;
}

function cardNames(card: ScryfallCard): string[] {
  const full = text(card.name);
  const faces = Array.isArray(card.card_faces) ? card.card_faces : [];
  const faceNames = faces.map((face) => text((face as ScryfallFace)?.name)).filter(Boolean);

  return [full, ...faceNames].map((name) => name.trim()).filter(Boolean);
}

/**
 * What a card says, in the shape a card face reads.
 *
 * The summary is split across lines because the card face turns each line into
 * its own bullet and keeps the first five. Cost and type lead, since those are
 * what a player asks for out loud, and the flavour text is last so it is the
 * first thing dropped when the rules text runs long.
 */
function describeCard(card: ScryfallCard): Pick<Entity, "type" | "summary"> & Partial<Pick<Entity, "image">> {
  const face = firstFace(card);
  const typeLine = text(card.type_line);
  const lines = [
    [text(face.mana_cost), typeLine].filter(Boolean).join("  "),
    text(face.oracle_text),
    text(card.flavor_text),
  ].filter(Boolean);

  const image = imageUri(face) || imageUri(card);
  const described = normalizeIngestedEntity({
    name: text(card.name) || "card",
    type: cardTypeWord(typeLine),
    summary: lines.join("\n"),
    ...(image ? { image } : {}),
  });

  return {
    type: described?.type ?? "Item",
    summary: described?.summary ?? "",
    ...(described?.image ? { image: described.image } : {}),
  };
}

/**
 * A word the entity normalizer already knows, chosen from the card's type line.
 *
 * Magic's own vocabulary means nothing to `normalizeEntityType`, which reads
 * D&D's, so the mapping happens here and the one normalizer still decides what
 * an `EntityType` is. Creatures and planeswalkers are the cards that act like
 * people, lands are the ones that act like places, and the rest are things.
 */
function cardTypeWord(typeLine: string): string {
  const line = typeLine.toLowerCase();
  if (line.includes("creature") || line.includes("planeswalker")) return "character";
  if (line.includes("land")) return "location";
  return "item";
}

const firstFace = (card: ScryfallCard): ScryfallFace => {
  const faces = Array.isArray(card.card_faces) ? card.card_faces : [];
  const face = faces[0];
  const hasOwnText = face !== null && typeof face === "object" && text(card.oracle_text) === "";
  return hasOwnText ? (face as ScryfallFace) : card;
};

function imageUri(face: ScryfallFace): string {
  const uris = face.image_uris;
  if (uris === null || typeof uris !== "object") return "";
  return text((uris as Record<string, unknown>).normal) || text((uris as Record<string, unknown>).small);
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Both sides of the name comparison reduced to one spelling. */
const matchKey = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function getJson<T>(path: string): Promise<T> {
  return readJson<T>(path, { headers: { Accept: "application/json" } });
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return readJson<T>(path, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SCRYFALL}${path}`, init);
  } catch (e: unknown) {
    throw handleCorsError(e, SOURCE_NAME, "Check the network connection and try again.");
  }
  if (!res.ok) throw new Error(`${SOURCE_NAME} request failed: ${res.status} ${path}`);
  return (await res.json()) as T;
}
