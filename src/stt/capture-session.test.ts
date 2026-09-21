import { describe, expect, it, vi } from "vitest";

import { CaptureSession } from "./capture-session";

import type { CaptureSessionState } from "./capture-session";
import type { STTProvider, STTSettings } from "./index";

const SETTINGS: STTSettings = { provider: "web-speech", deepgramApiKey: "" };

class FakeCaptureAdapter implements STTProvider {
  readonly name = "Fake Capture";
  startCalls = 0;
  pauseCalls = 0;
  resumeCalls = 0;
  stopCalls = 0;
  startResult: Promise<void> | null = null;
  startError: unknown = null;
  resumeError: unknown = null;

  constructor(
    private readonly onTranscript: (text: string) => void,
    private readonly onError: (error: string) => void,
  ) {}

  start = () => (
    (this.startCalls += 1),
    this.startError ? Promise.reject(this.startError) : (this.startResult ?? Promise.resolve())
  );

  pause = async () => void (this.pauseCalls += 1);
  resume = async () => {
    this.resumeCalls += 1;
    if (this.resumeError) throw this.resumeError;
  };
  stop = async () => void (this.stopCalls += 1);

  emitTranscript = (text: string) => this.onTranscript(text);
  emitError = (error: string) => this.onError(error);
}

function makeSession(configure?: (adapter: FakeCaptureAdapter) => void) {
  const adapters: FakeCaptureAdapter[] = [];
  const onTranscript = vi.fn();
  const states: CaptureSessionState[] = [];
  const session = new CaptureSession({
    loadSettings: async () => SETTINGS,
    buildProvider: (_settings, safeTranscript, safeError) => {
      const adapter = new FakeCaptureAdapter(safeTranscript, safeError);
      configure?.(adapter);
      adapters.push(adapter);
      return adapter;
    },
    onTranscript,
    onState: (state) => void states.push(state),
  });
  return { adapters, onTranscript, session, states };
}

const statuses = (states: CaptureSessionState[]) => states.map((state) => state.status);

/** The session builds its provider only after `loadSettings` settles. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("capture session", () => {
  it("pauses the running capture instead of tearing it down", async () => {
    const { adapters, session } = makeSession();

    await session.start();
    await session.pause();

    expect(adapters).toHaveLength(1);
    expect(adapters[0].pauseCalls).toBe(1);
    expect(adapters[0].stopCalls).toBe(0);
  });

  it("resumes the held capture without building a second one", async () => {
    const { adapters, session } = makeSession();

    await session.start();
    await session.pause();
    await session.start();

    expect(adapters).toHaveLength(1);
    expect(adapters[0].resumeCalls).toBe(1);
    expect(adapters[0].startCalls).toBe(1);
    expect(adapters[0].stopCalls).toBe(0);
  });

  it("drops transcripts heard while paused and delivers them again after resume", async () => {
    const { adapters, onTranscript, session } = makeSession();

    await session.start();
    adapters[0].emitTranscript("heard while active");
    await session.pause();
    adapters[0].emitTranscript("heard while paused");
    await session.start();
    adapters[0].emitTranscript("heard after resume");

    expect(onTranscript.mock.calls.flat()).toEqual(["heard while active", "heard after resume"]);
  });

  it("drops transcript and error events from a stopped capture generation", async () => {
    const { adapters, onTranscript, session, states } = makeSession();

    await session.start();
    adapters[0].emitTranscript("heard while active");
    await session.stop();
    adapters[0].emitTranscript("late after stop");
    adapters[0].emitError("late error after stop");

    expect(adapters[0].stopCalls).toBe(1);
    expect(onTranscript.mock.calls.flat()).toEqual(["heard while active"]);
    expect(statuses(states)).not.toContain("error");
  });

  it("builds a fresh capture after stop", async () => {
    const { adapters, session } = makeSession();

    await session.start();
    await session.stop();
    await session.start();

    expect(adapters).toHaveLength(2);
    expect(adapters[1].startCalls).toBe(1);
  });

  it("cancels stop-during-start so startup completions cannot deliver stale events", async () => {
    let reject!: (error: unknown) => void;
    const startup = new Promise<void>((_resolve, rej) => (reject = rej));
    const { adapters, onTranscript, session, states } = makeSession(
      (adapter) => (adapter.startResult = startup),
    );

    const start = session.start();
    await flush();
    adapters[0].emitTranscript("too early");
    const stop = session.stop();
    reject(new Error("mic failed after stop"));
    adapters[0].emitError("late startup error");

    await expect(start).resolves.toBeUndefined();
    await expect(stop).resolves.toBeUndefined();
    expect(adapters[0].stopCalls).toBe(1);
    expect(onTranscript).not.toHaveBeenCalled();
    expect(statuses(states)).not.toContain("error");
  });

  it("reports a start failure as a start-cause error and stays startable", async () => {
    const { session, states } = makeSession((adapter) => (adapter.startError = new Error("permission denied")));

    await expect(session.start()).resolves.toBeUndefined();

    const failure = states.at(-1);
    expect(failure).toEqual({ status: "error", cause: "start", error: expect.stringContaining("permission denied") });
  });

  it("reports a provider error mid-capture as a capture-cause error", async () => {
    const { adapters, session, states } = makeSession();

    await session.start();
    adapters[0].emitError("socket closed");

    expect(states.at(-1)).toEqual({ status: "error", cause: "capture", error: "socket closed" });
    expect(adapters[0].stopCalls).toBe(1);
  });

  it("reports a failed resume as a capture-cause error and drops the provider", async () => {
    const { adapters, session, states } = makeSession((adapter) => (adapter.resumeError = new Error("mic gone")));

    await session.start();
    await session.pause();
    await session.start();

    expect(states.at(-1)).toEqual({ status: "error", cause: "capture", error: expect.stringContaining("mic gone") });
    expect(adapters[0].stopCalls).toBe(1);
  });

  it("announces connecting then active with the provider name", async () => {
    const { session, states } = makeSession();

    await session.start();

    expect(states).toEqual([
      { status: "connecting", providerName: "" },
      { status: "connecting", providerName: "Fake Capture" },
      { status: "active", providerName: "Fake Capture" },
    ]);
  });

  it("shares one attempt across concurrent starts", async () => {
    const { adapters, session } = makeSession();

    await Promise.all([session.start(), session.start()]);

    expect(adapters).toHaveLength(1);
    expect(adapters[0].startCalls).toBe(1);
  });
});
