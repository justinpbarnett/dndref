import { beforeEach, describe, expect, it, vi } from "vitest";

import { RuntimeEntityHydration, type EntityHydrator } from "./entity-hydration";
import { INITIAL_SESSION_RUNTIME_SNAPSHOT, type SessionRuntimeSnapshot } from "./runtime-types";
import type { Entity } from "../../entities/index";
import type { CardState } from "../session-types";

const named = (name: string, summary = ""): Entity => ({
  id: `mtg-${name}`,
  name,
  type: "Unknown",
  aliases: [],
  summary,
});

const onStack = (entity: Entity): CardState => ({ instanceId: `${entity.id}-1`, entity, pinned: false });

function harness() {
  let snapshot: SessionRuntimeSnapshot = { ...INITIAL_SESSION_RUNTIME_SNAPSHOT };
  const hydration = new RuntimeEntityHydration({
    getSnapshot: () => snapshot,
    updateSnapshot: (patch) => void (snapshot = { ...snapshot, ...patch }),
  });

  return {
    hydration,
    deal: (...entities: Entity[]) => void (snapshot = { ...snapshot, cards: entities.map(onStack) }),
    cards: () => snapshot.cards,
    summaryOf: (name: string) => snapshot.cards.find((card) => card.entity.name === name)?.entity.summary,
  };
}

/** Answers with the text a real source would have attached. */
const fills = (...names: string[]): EntityHydrator & { calls: string[][] } => {
  const calls: string[][] = [];
  const hydrate = async (entities: Entity[]) => {
    calls.push(entities.map((entity) => entity.name));
    return entities.map((entity) => (names.includes(entity.name) ? { ...entity, summary: `text for ${entity.name}` } : entity));
  };
  return Object.assign(hydrate, { calls });
};

describe("RuntimeEntityHydration", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => void (warn = vi.spyOn(console, "warn").mockImplementation(() => {})));

  it("fills in a card already on the stack once the answer arrives", async () => {
    const table = harness();
    const bolt = named("Lightning Bolt");
    table.hydration.setHydrator(fills("Lightning Bolt"));
    table.deal(bolt);

    await table.hydration.fill([bolt]);

    expect(table.summaryOf("Lightning Bolt")).toBe("text for Lightning Bolt");
  });

  it("asks about a name once, however many passes name it", async () => {
    const table = harness();
    const bolt = named("Lightning Bolt");
    const hydrate = fills("Lightning Bolt");
    table.hydration.setHydrator(hydrate);
    table.deal(bolt);

    await table.hydration.fill([bolt]);
    await table.hydration.fill([bolt]);
    await table.hydration.fill([bolt]);

    expect(hydrate.calls).toEqual([["Lightning Bolt"]]);
  });

  it("gives a dismissed card its text back without a second request", async () => {
    const table = harness();
    const bolt = named("Lightning Bolt");
    const hydrate = fills("Lightning Bolt");
    table.hydration.setHydrator(hydrate);
    table.deal(bolt);
    await table.hydration.fill([bolt]);

    // The card is dismissed and the name is said again. What comes back from the
    // detector is the index entity, which never carried any text.
    table.deal();
    table.deal(bolt);
    await table.hydration.fill([bolt]);

    expect(table.summaryOf("Lightning Bolt")).toBe("text for Lightning Bolt");
    expect(hydrate.calls).toHaveLength(1);
  });

  it("does not ask about an entity that already carries its text", async () => {
    const table = harness();
    const known = named("Ironspire Fortress", "Ancient dwarven stronghold.");
    const hydrate = fills("Ironspire Fortress");
    table.hydration.setHydrator(hydrate);
    table.deal(known);

    await table.hydration.fill([known]);

    expect(hydrate.calls).toHaveLength(0);
    expect(table.summaryOf("Ironspire Fortress")).toBe("Ancient dwarven stronghold.");
  });

  it("leaves the stack untouched with no hydrator, which is the D&D case", async () => {
    const table = harness();
    const valdrath = named("Valdrath");
    table.deal(valdrath);
    const before = table.cards();

    await table.hydration.fill([valdrath]);

    expect(table.cards()).toBe(before);
  });

  it("asks again after a failed request, so a dropped connection is not permanent", async () => {
    const table = harness();
    const bolt = named("Lightning Bolt");
    const calls: string[][] = [];
    let failing = true;
    table.hydration.setHydrator(async (entities) => {
      calls.push(entities.map((entity) => entity.name));
      if (failing) throw new Error("offline");
      return entities.map((entity) => ({ ...entity, summary: "text for Lightning Bolt" }));
    });
    table.deal(bolt);

    await table.hydration.fill([bolt]);
    expect(table.summaryOf("Lightning Bolt")).toBe("");

    failing = false;
    await table.hydration.fill([bolt]);

    expect(calls).toHaveLength(2);
    expect(table.summaryOf("Lightning Bolt")).toBe("text for Lightning Bolt");
    expect(warn).toHaveBeenCalled();
  });

  it("does not ask again about a name the source answered with nothing", async () => {
    const table = harness();
    const ghost = named("Not A Card");
    const hydrate = fills();
    table.hydration.setHydrator(hydrate);
    table.deal(ghost);

    await table.hydration.fill([ghost]);
    await table.hydration.fill([ghost]);

    expect(hydrate.calls).toHaveLength(1);
  });

  it("forgets what it learned when the world changes", async () => {
    const table = harness();
    const bolt = named("Lightning Bolt");
    table.hydration.setHydrator(fills("Lightning Bolt"));
    table.deal(bolt);
    await table.hydration.fill([bolt]);

    const afterSwitch = fills("Lightning Bolt");
    table.hydration.setHydrator(afterSwitch);
    table.deal(bolt);
    await table.hydration.fill([bolt]);

    expect(afterSwitch.calls).toEqual([["Lightning Bolt"]]);
  });

  it("does not touch the snapshot when the filled card is not on the stack", async () => {
    const table = harness();
    const bolt = named("Lightning Bolt");
    table.hydration.setHydrator(fills("Lightning Bolt"));
    table.deal();
    const before = table.cards();

    await table.hydration.fill([bolt]);

    expect(table.cards()).toBe(before);
  });
});
