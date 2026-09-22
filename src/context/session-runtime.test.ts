import { describe, expect, it, vi } from "vitest";

import { SessionRuntime, type SessionRuntimeDetector } from "./session-runtime";
import { DETECTION_TUNING } from "../entities/detection-tuning";
import type { Entity } from "../entities/index";
import type { STTProvider } from "../stt/index";

const makeEntity = (id: string, name: string): Entity => ({
  id,
  name,
  type: "NPC",
  aliases: [],
  summary: `${name} summary`,
});

class FakeDetector implements SessionRuntimeDetector {
  inputs: string[] = [];

  constructor(private readonly respond: (input: string) => Entity[]) {}

  detect = (input: string): Entity[] => (this.inputs.push(input), this.respond(input));
}

class FakeSTTProvider implements STTProvider {
  readonly name = "Fake STT";
  pauseCalls = 0;
  resumeCalls = 0;
  startCalls = 0;
  stopCalls = 0;
  resumeError: unknown = null;
  startError: unknown = null;

  constructor(
    private readonly onTranscript: (text: string) => void,
    private readonly onError: (error: string) => void,
  ) {}

  start = () => ((this.startCalls += 1), this.startError ? Promise.reject(this.startError) : Promise.resolve());
  pause = async () => void (this.pauseCalls += 1);
  resume = () => ((this.resumeCalls += 1), this.resumeError ? Promise.reject(this.resumeError) : Promise.resolve());
  stop = async () => void (this.stopCalls += 1);

  emitTranscript = (text: string) => this.onTranscript(text);
  emitError = (error: string) => this.onError(error);
}

function makeRuntimeWithFakeStt(configure?: (provider: FakeSTTProvider) => void): {
  providers: FakeSTTProvider[];
  runtime: SessionRuntime;
} {
  const providers: FakeSTTProvider[] = [];
  const runtime = new SessionRuntime({
    loadSttSettings: async () => ({ provider: "web-speech", deepgramApiKey: "" }),
    buildSttProvider: (_settings, onTranscript, onError) => {
      const provider = new FakeSTTProvider(onTranscript, onError);
      configure?.(provider);
      providers.push(provider);
      return provider;
    },
    detectIntervalMs: 0,
  });
  return { providers, runtime };
}

const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();

describe("SessionRuntime", () => {
  it("carries active transcript context so split entity names are detected", () => {
    const redOakKeep = makeEntity("red-oak-keep", "Red Oak Keep");
    const detector = new FakeDetector((input) => (normalizeSpaces(input).includes("Red Oak Keep") ? [redOakKeep] : []));
    const runtime = new SessionRuntime();

    runtime.setDetector(detector);
    runtime.activate();
    runtime.appendTranscript("The party reached Red");
    runtime.processTranscript();
    runtime.appendTranscript("Oak Keep before sunset");
    runtime.processTranscript();

    const lastInput = detector.inputs[detector.inputs.length - 1];
    expect(normalizeSpaces(lastInput)).toContain("Red Oak Keep before sunset");
    expect(runtime.getSnapshot().cards.map((card) => card.entity.name)).toEqual(["Red Oak Keep"]);
    expect(runtime.getSnapshot().recentDetections).toEqual([redOakKeep]);
  });

  it("reads only the speech since the last pass, plus a bounded carried tail", () => {
    const detector = new FakeDetector(() => []);
    const runtime = new SessionRuntime();
    const longAside = `the party argues about rations. ${"they argue some more. ".repeat(20)}`;
    const newSpeech = "Valdrath watches from the throne";

    runtime.setDetector(detector);
    runtime.activate();
    runtime.appendTranscript(longAside);
    runtime.processTranscript();
    runtime.appendTranscript(newSpeech);
    runtime.processTranscript();

    // Stated as the exact tail rather than as a bound: a carry-over that never
    // truncated would satisfy any bound this fixture is large enough to state.
    const carriedTail = longAside.slice(-DETECTION_TUNING.carryOverChars);
    expect(detector.inputs).toHaveLength(2);
    expect(detector.inputs[1].startsWith(carriedTail)).toBe(true);
    expect(normalizeSpaces(detector.inputs[1])).toBe(normalizeSpaces(`${carriedTail} ${newSpeech}`));
  });

  it("reads only the speech since a resume, never the transcript from before the pause", async () => {
    const detector = new FakeDetector(() => []);
    const { runtime } = makeRuntimeWithFakeStt();

    runtime.setDetector(detector);
    await runtime.start();
    runtime.appendTranscript("Valdrath watches from the throne");
    runtime.pause();
    await runtime.resume();
    runtime.appendTranscript("Seraphine speaks after the resume");
    runtime.processTranscript();

    expect(detector.inputs.map(normalizeSpaces)).toEqual(["Seraphine speaks after the resume"]);
  });

  it("stops feeding the detector once a pass has nothing new to read", () => {
    const detector = new FakeDetector(() => []);
    const runtime = new SessionRuntime();

    runtime.setDetector(detector);
    runtime.activate();
    runtime.appendTranscript("Valdrath watches from the throne");
    runtime.processTranscript();
    runtime.processTranscript();
    runtime.processTranscript();

    expect(detector.inputs).toHaveLength(1);
  });

  it("suppresses duplicate detections without replacing recent detections or cards", () => {
    const valdrath = makeEntity("valdrath", "Valdrath the Undying");
    const detector = new FakeDetector((input) => (input.includes("Valdrath") ? [valdrath] : []));
    const runtime = new SessionRuntime();

    runtime.setDetector(detector);
    runtime.activate();
    runtime.appendTranscript("Valdrath spoke first");
    runtime.processTranscript();
    const firstCards = runtime.getSnapshot().cards;
    const firstRecentDetections = runtime.getSnapshot().recentDetections;

    runtime.appendTranscript("then Valdrath spoke again");
    runtime.processTranscript();

    expect(runtime.getSnapshot().cards).toBe(firstCards);
    expect(runtime.getSnapshot().cards).toHaveLength(1);
    expect(runtime.getSnapshot().recentDetections).toBe(firstRecentDetections);
  });

  it("adds detected entities to the card stack and recent detections", () => {
    const valdrath = makeEntity("valdrath", "Valdrath the Undying");
    const malachar = makeEntity("malachar", "Malachar the Grey");
    const detector = new FakeDetector(() => [valdrath, malachar]);
    const runtime = new SessionRuntime();

    runtime.setDetector(detector);
    runtime.activate();
    runtime.appendTranscript("Valdrath summoned Malachar to the fortress");
    runtime.processTranscript();

    const { cards, recentDetections } = runtime.getSnapshot();
    expect(cards.map((card) => card.entity.id).sort()).toEqual(["malachar", "valdrath"]);
    expect(cards).toHaveLength(2);
    expect(cards.every((card) => !card.pinned)).toBe(true);
    expect(recentDetections).toEqual([valdrath, malachar]);
  });

  it("runs detection from its own active interval and clears the interval when paused", () => {
    vi.useFakeTimers();
    let runtime: SessionRuntime | null = null;
    try {
      const valdrath = makeEntity("valdrath", "Valdrath the Undying");
      const seraphine = makeEntity("seraphine", "Lady Seraphine Voss");
      const detector = new FakeDetector((input) => [
        ...(input.includes("Valdrath") ? [valdrath] : []),
        ...(input.includes("Seraphine") ? [seraphine] : []),
      ]);
      runtime = new SessionRuntime({ detectIntervalMs: 100 });
      runtime.setDetector(detector);

      runtime.activate();
      runtime.appendTranscript("Valdrath watches from the throne");
      vi.advanceTimersByTime(100);
      expect(runtime.getSnapshot().cards.map((card) => card.entity.id)).toEqual(["valdrath"]);

      runtime.pause();
      runtime.appendTranscript("Seraphine entered while paused");
      vi.advanceTimersByTime(300);
      expect(runtime.getSnapshot().cards.map((card) => card.entity.id)).toEqual(["valdrath"]);
    } finally {
      runtime?.dispose();
      vi.useRealTimers();
    }
  });

  it("starts, pauses, resumes, gates speech, and stops through the runtime", async () => {
    const valdrath = makeEntity("valdrath", "Valdrath the Undying");
    const detector = new FakeDetector((input) => (input.includes("Valdrath") ? [valdrath] : []));
    const { providers, runtime } = makeRuntimeWithFakeStt();
    runtime.setDetector(detector);

    await runtime.start();
    const provider = providers[0];
    expect(runtime.getSnapshot()).toMatchObject({
      status: "active",
      sttStatus: "active",
      sttError: null,
      sttProviderName: "Fake STT",
    });

    provider.emitTranscript("Valdrath spoke first");
    runtime.processTranscript();
    expect(runtime.getSnapshot().cards.map((card) => card.entity.id)).toEqual(["valdrath"]);

    runtime.pause();
    expect(provider.pauseCalls).toBe(1);
    provider.emitTranscript("Malachar was only heard while paused");
    expect(runtime.getSnapshot().transcript).toBe("Valdrath spoke first");

    await runtime.resume();
    expect(providers).toHaveLength(1);
    expect(provider.resumeCalls).toBe(1);
    provider.emitTranscript("Seraphine spoke after resume");
    expect(runtime.getSnapshot().transcript).toBe("Valdrath spoke first Seraphine spoke after resume");

    runtime.stop();
    expect(provider.stopCalls).toBe(1);
    expect(runtime.getSnapshot()).toMatchObject({
      status: "idle",
      sttStatus: "idle",
      sttError: null,
      sttProviderName: "",
      cards: [],
      recentDetections: [],
      transcript: "",
    });
    provider.emitTranscript("late speech");
    provider.emitError("late error");
    expect(runtime.getSnapshot()).toMatchObject({ sttError: null, transcript: "" });
  });

  it("reports start failures, clears provider state, and can retry", async () => {
    let failNextStart = true;
    const { providers, runtime } = makeRuntimeWithFakeStt((provider) => {
      if (failNextStart) {
        provider.startError = new Error("permission denied");
        failNextStart = false;
      }
    });

    await runtime.start();
    expect(providers[0]).toMatchObject({ startCalls: 1, stopCalls: 1 });
    expect(runtime.getSnapshot()).toMatchObject({
      status: "idle",
      sttStatus: "error",
      sttError: "Failed to start mic: permission denied",
      sttProviderName: "",
    });

    await runtime.start();
    expect(providers).toMatchObject([expect.any(FakeSTTProvider), { startCalls: 1 }]);
    expect(runtime.getSnapshot()).toMatchObject({ status: "active", sttStatus: "active", sttError: null });
  });

  it("reports resume failures, ignores stale speech, and creates a fresh provider on retry", async () => {
    const { providers, runtime } = makeRuntimeWithFakeStt();
    await runtime.start();
    const provider = providers[0];
    runtime.pause();
    provider.resumeError = new Error("device lost");

    await runtime.resume();
    expect(provider).toMatchObject({ resumeCalls: 1, stopCalls: 1 });
    expect(runtime.getSnapshot()).toMatchObject({
      status: "paused",
      sttStatus: "error",
      sttError: "Failed to resume mic: device lost",
    });

    provider.emitTranscript("stale speech after resume failure");
    expect(runtime.getSnapshot().transcript).toBe("");

    await runtime.start();
    expect(providers).toHaveLength(2);
    expect(runtime.getSnapshot()).toMatchObject({ status: "active", sttStatus: "active", sttError: null });
  });

  it("handles provider error callbacks by pausing and allowing a fresh start", async () => {
    const { providers, runtime } = makeRuntimeWithFakeStt();
    await runtime.start();
    const provider = providers[0];

    provider.emitError("Mic error: audio-capture");

    expect(provider.stopCalls).toBe(1);
    expect(runtime.getSnapshot()).toMatchObject({
      status: "paused",
      sttStatus: "error",
      sttError: "Mic error: audio-capture",
    });
    provider.emitTranscript("speech after fatal error");
    expect(runtime.getSnapshot().transcript).toBe("");

    await runtime.start();
    expect(providers).toHaveLength(2);
    expect(runtime.getSnapshot()).toMatchObject({ status: "active", sttStatus: "active", sttError: null });
  });
});
