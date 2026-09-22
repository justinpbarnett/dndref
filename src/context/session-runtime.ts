import { SnapshotStore } from "../utils/snapshot-store";
import { RuntimeCardActions } from "./session-runtime/card-actions";
import { RuntimeDetectionLoop } from "./session-runtime/detection-loop";
import { RuntimeEntityHydration, type EntityHydrator } from "./session-runtime/entity-hydration";
import { INITIAL_SESSION_RUNTIME_SNAPSHOT } from "./session-runtime/runtime-types";
import type {
  SessionRuntimeDetector,
  SessionRuntimeOptions,
  SessionRuntimeSnapshot,
  SessionRuntimeSnapshotPatch,
} from "./session-runtime/runtime-types";
import { RuntimeSttLifecycle } from "./session-runtime/stt-lifecycle";

export type { SessionRuntimeDetector, SessionRuntimeOptions, SessionRuntimeSnapshot } from "./session-runtime/runtime-types";
export type { EntityHydrator } from "./session-runtime/entity-hydration";
type SnapshotPatch = SessionRuntimeSnapshotPatch;

export class SessionRuntime extends SnapshotStore<SessionRuntimeSnapshot> {
  private readonly cardActions: RuntimeCardActions;
  private readonly detectionLoop: RuntimeDetectionLoop;
  private readonly entityHydration: RuntimeEntityHydration;
  private readonly sttLifecycle: RuntimeSttLifecycle;

  constructor(options: SessionRuntimeOptions = {}) {
    super(INITIAL_SESSION_RUNTIME_SNAPSHOT);
    this.cardActions = new RuntimeCardActions({
      getCards: () => this.snapshot.cards,
      updateSnapshot: (patch) => this.updateSnapshot(patch),
    });
    this.entityHydration = new RuntimeEntityHydration({
      getSnapshot: () => this.snapshot,
      updateSnapshot: (patch) => this.updateSnapshot(patch),
    });
    this.detectionLoop = new RuntimeDetectionLoop({
      detectIntervalMs: options.detectIntervalMs ?? 0,
      getSnapshot: () => this.snapshot,
      updateSnapshot: (patch) => this.updateSnapshot(patch),
      onCardsAdded: (entities) => void this.entityHydration.fill(entities),
    });
    this.sttLifecycle = new RuntimeSttLifecycle(options, {
      appendTranscript: (text) => this.appendTranscript(text),
      setSessionActive: (patch) => this.setSessionActive(patch),
      setSessionPaused: (patch) => this.setSessionPaused(patch),
      updateSnapshot: (patch) => this.updateSnapshot(patch),
    });
  }

  setDetector = (detector: SessionRuntimeDetector | null): void => this.detectionLoop.setDetector(detector);
  setHydrator = (hydrate: EntityHydrator | null): void => this.entityHydration.setHydrator(hydrate);
  start = (): Promise<void> => this.sttLifecycle.start();
  resume = (): Promise<void> => this.start();
  activate = (): void => this.setSessionActive();
  pause = (): void => this.sttLifecycle.pause();
  processTranscript = (): void => this.detectionLoop.processTranscript();
  appendTranscript = (text: string): void => this.detectionLoop.appendTranscript(text);

  stop(): void {
    this.sttLifecycle.stop();
    this.resetSession({ sttStatus: "idle", sttError: null, sttProviderName: "" });
  }

  dispose(): void {
    this.sttLifecycle.stop();
    this.detectionLoop.dispose();
    this.clearSnapshotListeners();
  }

  pin = (instanceId: string): void => this.cardActions.pin(instanceId);
  unpin = (instanceId: string): void => this.cardActions.unpin(instanceId);
  dismiss = (instanceId: string): void => this.cardActions.dismiss(instanceId);
  clearCards = (): void => this.cardActions.clear();

  private setSessionActive(patch: SnapshotPatch = {}): void {
    this.detectionLoop.activate();
    this.updateSnapshot({ status: "active", ...patch });
  }

  private setSessionPaused(patch: SnapshotPatch = {}): void {
    this.detectionLoop.pause();
    this.updateSnapshot({ status: "paused", ...patch });
  }

  private resetSession(patch: SnapshotPatch = {}): void {
    this.detectionLoop.reset();
    this.updateSnapshot({ status: "idle", cards: [], transcript: "", recentDetections: [], ...patch });
  }
}
