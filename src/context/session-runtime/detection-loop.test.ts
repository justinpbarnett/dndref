import { describe, expect, it } from "vitest";

import { EntityDetector } from "../../entities/detector";
import type { Entity } from "../../entities/index";
import { SessionRuntime } from "../session-runtime";

const entity = (id: string, name: string, aliases: string[] = []): Entity => ({
  id,
  name,
  type: "NPC",
  aliases,
  summary: `${name} summary`,
});

const cardNames = (runtime: SessionRuntime): string[] => runtime.getSnapshot().cards.map((card) => card.entity.name);

function listening(detector: EntityDetector): SessionRuntime {
  const runtime = new SessionRuntime();
  runtime.setDetector(detector);
  runtime.activate();
  return runtime;
}

describe("carry-over does not revive a match that ended before the new speech", () => {
  const valdrath = entity("valdrath", "Valdrath the Undying", ["Valdrath", "the Undying"]);

  it("keeps a dismissed card dismissed when the next line does not say the name", () => {
    const runtime = listening(new EntityDetector([valdrath]));

    runtime.appendTranscript("Valdrath watches from the throne");
    runtime.processTranscript();
    expect(cardNames(runtime)).toEqual(["Valdrath the Undying"]);

    runtime.dismiss(runtime.getSnapshot().cards[0].instanceId);
    runtime.appendTranscript("okay what do we do next");
    runtime.processTranscript();

    expect(cardNames(runtime)).toEqual([]);
  });

  it("still detects a name split across two utterances", () => {
    const keep = entity("red-oak-keep", "Red Oak Keep");
    const runtime = listening(new EntityDetector([keep]));

    runtime.appendTranscript("The party reached Red");
    runtime.processTranscript();
    expect(cardNames(runtime)).toEqual([]);

    runtime.appendTranscript("Oak Keep before sunset");
    runtime.processTranscript();

    expect(cardNames(runtime)).toEqual(["Red Oak Keep"]);
  });

  it("brings a dismissed card back when the name is spoken in the new speech", () => {
    const runtime = listening(new EntityDetector([valdrath]));

    runtime.appendTranscript("Valdrath watches from the throne");
    runtime.processTranscript();
    runtime.dismiss(runtime.getSnapshot().cards[0].instanceId);

    runtime.appendTranscript("okay Valdrath what do we do next");
    runtime.processTranscript();

    expect(cardNames(runtime)).toEqual(["Valdrath the Undying"]);
  });

  it("accepts a match that starts in the carried tail and ends in the new speech", () => {
    const runtime = listening(new EntityDetector([valdrath]));

    runtime.appendTranscript("then Valdrath the");
    runtime.processTranscript();
    expect(cardNames(runtime)).toEqual(["Valdrath the Undying"]);

    runtime.dismiss(runtime.getSnapshot().cards[0].instanceId);
    runtime.appendTranscript("Undying rises");
    runtime.processTranscript();

    expect(cardNames(runtime)).toEqual(["Valdrath the Undying"]);
  });

  it("keeps a dismissed tail-only name dismissed when the next line contains a capital sigma", () => {
    const kosmos = "\u039a\u039f\u03a3\u039c\u039f\u03a3";
    const detector = new EntityDetector([valdrath]);
    const runtime = listening(detector);

    runtime.appendTranscript("Valdrath watches from the throne");
    runtime.processTranscript();
    runtime.dismiss(runtime.getSnapshot().cards[0].instanceId);
    runtime.appendTranscript(`okay ${kosmos} what do we do next`);
    runtime.processTranscript();
    expect(cardNames(runtime)).toEqual([]);

    expect(detector.detect(`Valdrath watches ${kosmos} from the throne`).map((hit) => hit.name)).toEqual(
      detector.detect("Valdrath watches from the throne").map((hit) => hit.name),
    );
  });

  it("keeps a dismissed exact-match card dismissed until the name is spoken again", () => {
    const bolt = entity("bolt", "Lightning Bolt");
    const runtime = listening(new EntityDetector([bolt], "exact"));

    runtime.appendTranscript("I cast Lightning Bolt");
    runtime.processTranscript();
    runtime.dismiss(runtime.getSnapshot().cards[0].instanceId);
    runtime.appendTranscript("okay what do we do next");
    runtime.processTranscript();
    expect(cardNames(runtime)).toEqual([]);

    runtime.appendTranscript("another Lightning Bolt");
    runtime.processTranscript();
    expect(cardNames(runtime)).toEqual(["Lightning Bolt"]);
  });
});
