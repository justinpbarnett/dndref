import type { Entity } from "../entities";
import type { STTProvider } from "../stt";
import { addCard, dismissCard, pinCard, unpinCard } from "./card-stack";
import { buildDetectionInput, nextDetectionContext } from "./detection-window";
import type { CardState } from "./session-types";
import {
  INITIAL_SESSION_RUNTIME_SNAPSHOT,
  type DetectionInterval,
  type SessionRuntimeDetector,
  type SessionRuntimeListener,
  type SessionRuntimeOptions,
  type SessionRuntimeSnapshot,
  type SnapshotPatch,
} from "./session-runtime-types";

export type { SessionRuntimeDetector, SessionRuntimeOptions, SessionRuntimeSnapshot } from "./session-runtime-types";

export class SessionRuntime {
  private acceptingTranscript = false;
  private detector: SessionRuntimeDetector | null = null;
  private detectionInterval: DetectionInterval | null = null;
  private lastDetectionKey = "";
  private listeners = new Set<SessionRuntimeListener>();
  private previousDetectionContext = "";
  private processedTranscriptLength = 0;
  private startInFlight: Promise<void> | null = null;
  private sttGeneration = 0;
  private sttProvider: STTProvider | null = null;
  private snapshot: SessionRuntimeSnapshot = INITIAL_SESSION_RUNTIME_SNAPSHOT;

  constructor(private readonly options: SessionRuntimeOptions = {}) {}

  getSnapshot(): SessionRuntimeSnapshot {
    return this.snapshot;
  }

  subscribe(listener: SessionRuntimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setDetector(detector: SessionRuntimeDetector | null): void {
    this.detector = detector;
  }

  start(): Promise<void> {
    if (this.startInFlight) return this.startInFlight;

    const command = this.sttProvider
      ? this.resumeExistingProvider(this.sttProvider, this.sttGeneration)
      : this.startNewProvider();

    this.startInFlight = command;
    command.then(
      () => this.clearStartInFlight(command),
      () => this.clearStartInFlight(command),
    );
    return command;
  }

  resume(): Promise<void> {
    return this.start();
  }
  activate(): void {
    this.setSessionActive();
  }

  pause(): void {
    this.acceptingTranscript = false;
    const provider = this.sttProvider;
    if (provider) void Promise.resolve(provider.pause()).catch(() => {});
    this.setSessionPaused({ sttStatus: "idle" });
  }

  stop(): void {
    const provider = this.invalidateStt();
    if (provider) void this.stopProvider(provider);
    this.resetSession({ sttStatus: "idle", sttError: null, sttProviderName: "" });
  }

  dispose(): void {
    const provider = this.invalidateStt();
    this.clearDetectionInterval();
    if (provider) void this.stopProvider(provider);
    this.listeners.clear();
  }

  appendTranscript(text: string): void {
    const transcript = this.snapshot.transcript ? `${this.snapshot.transcript} ${text}` : text;
    this.updateSnapshot({ transcript });
  }

  processTranscript(): void {
    if (this.snapshot.status !== "active") return;
    if (!this.detector) return;
    const newText = this.snapshot.transcript.slice(this.processedTranscriptLength);
    if (!newText.trim()) return;

    const detectionInput = buildDetectionInput(this.previousDetectionContext, newText);
    const detectedEntities = this.detector.detect(detectionInput);
    this.processedTranscriptLength = this.snapshot.transcript.length;
    this.previousDetectionContext = nextDetectionContext(this.snapshot.transcript);
    if (detectedEntities.length === 0) return;

    let nextCards = this.snapshot.cards;
    for (const entity of detectedEntities) nextCards = addCard(nextCards, entity);
    const detectionKey = detectedEntities.map((entity) => entity.id).join(",");
    const recentDetectionsChanged = detectionKey !== this.lastDetectionKey;
    if (recentDetectionsChanged) this.lastDetectionKey = detectionKey;

    const cardsChanged = nextCards !== this.snapshot.cards;
    if (!cardsChanged && !recentDetectionsChanged) return;
    const snapshotPatch: SnapshotPatch = {};
    if (cardsChanged) snapshotPatch.cards = nextCards;
    if (recentDetectionsChanged) snapshotPatch.recentDetections = detectedEntities;
    this.updateSnapshot(snapshotPatch);
  }

  pin(instanceId: string): void {
    this.updateCards(pinCard(this.snapshot.cards, instanceId));
  }
  unpin(instanceId: string): void {
    this.updateCards(unpinCard(this.snapshot.cards, instanceId));
  }
  dismiss(instanceId: string): void {
    this.updateCards(dismissCard(this.snapshot.cards, instanceId));
  }

  private updateCards(cards: CardState[]): void {
    if (cards !== this.snapshot.cards) this.updateSnapshot({ cards });
  }

  private async startNewProvider(): Promise<void> {
    const generation = this.sttGeneration + 1;
    this.sttGeneration = generation;
    this.acceptingTranscript = false;
    this.updateSnapshot({ sttStatus: "connecting", sttError: null });

    try {
      const { loadSttSettings, buildSttProvider } = this.options;
      if (!loadSttSettings || !buildSttProvider) throw new Error("STT provider factory not configured.");
      const settings = await loadSttSettings();
      if (this.sttGeneration !== generation) return;
      const provider = buildSttProvider(
        settings,
        (text) => this.acceptProviderTranscript(text, generation),
        (error) => this.handleProviderError(error, generation),
      );
      this.sttProvider = provider;
      this.updateSnapshot({ sttProviderName: provider.name });

      await provider.start();
      if (this.sttGeneration !== generation || this.sttProvider !== provider) {
        await this.stopProvider(provider);
        return;
      }
      this.acceptingTranscript = true;
      this.setSessionActive({ sttStatus: "active", sttError: null });
    } catch (e) {
      if (this.sttGeneration !== generation) return;
      const provider = this.sttProvider;
      if (provider) void this.stopProvider(provider);
      this.sttProvider = null;
      this.acceptingTranscript = false;
      this.updateSnapshot({
        sttProviderName: "",
        sttError: `Failed to start mic: ${this.formatError(e)}`,
        sttStatus: "error",
      });
    }
  }

  private async resumeExistingProvider(provider: STTProvider, generation: number): Promise<void> {
    try {
      await Promise.resolve(provider.resume());
      if (this.sttGeneration !== generation || this.sttProvider !== provider) return;
      this.acceptingTranscript = true;
      this.setSessionActive({ sttStatus: "active", sttError: null });
    } catch (e) {
      if (this.sttGeneration !== generation || this.sttProvider !== provider) return;
      this.acceptingTranscript = false;
      await this.stopProvider(provider);
      if (this.sttProvider === provider) this.sttProvider = null;
      this.setSessionPaused({
        sttError: `Failed to resume mic: ${this.formatError(e)}`,
        sttStatus: "error",
      });
    }
  }

  private acceptProviderTranscript(text: string, generation: number): void {
    if (this.sttGeneration === generation && this.acceptingTranscript) this.appendTranscript(text);
  }

  private handleProviderError(error: string, generation: number): void {
    if (this.sttGeneration !== generation) return;
    this.acceptingTranscript = false;
    const provider = this.sttProvider;
    if (provider) void this.stopProvider(provider);
    this.sttProvider = null;
    const patch: SnapshotPatch = { sttError: error, sttStatus: "error" };
    if (this.snapshot.status === "active") this.setSessionPaused(patch);
    else this.updateSnapshot(patch);
  }

  private setSessionActive(patch: SnapshotPatch = {}): void {
    this.processedTranscriptLength = this.snapshot.transcript.length;
    this.previousDetectionContext = "";
    this.startDetectionInterval();
    this.updateSnapshot({ status: "active", ...patch });
  }

  private setSessionPaused(patch: SnapshotPatch = {}): void {
    this.previousDetectionContext = "";
    this.clearDetectionInterval();
    this.updateSnapshot({ status: "paused", ...patch });
  }

  private resetSession(patch: SnapshotPatch = {}): void {
    this.processedTranscriptLength = 0;
    this.previousDetectionContext = "";
    this.lastDetectionKey = "";
    this.clearDetectionInterval();
    this.updateSnapshot({ status: "idle", cards: [], transcript: "", recentDetections: [], ...patch });
  }

  private startDetectionInterval(): void {
    this.clearDetectionInterval();
    const detectIntervalMs = this.options.detectIntervalMs ?? 0;
    if (detectIntervalMs <= 0) return;
    this.detectionInterval = setInterval(() => this.processTranscript(), detectIntervalMs);
    (this.detectionInterval as { unref?: () => void }).unref?.();
  }

  private clearDetectionInterval(): void {
    if (!this.detectionInterval) return;
    clearInterval(this.detectionInterval);
    this.detectionInterval = null;
  }

  private clearStartInFlight(command: Promise<void>): void {
    if (this.startInFlight === command) this.startInFlight = null;
  }

  private invalidateStt(): STTProvider | null {
    this.sttGeneration += 1;
    this.startInFlight = null;
    this.acceptingTranscript = false;
    const provider = this.sttProvider;
    this.sttProvider = null;
    return provider;
  }

  private async stopProvider(provider: STTProvider): Promise<void> {
    try {
      await Promise.resolve(provider.stop());
    } catch {}
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private updateSnapshot(patch: SnapshotPatch): void {
    if (Object.keys(patch).length === 0) return;
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }
}
