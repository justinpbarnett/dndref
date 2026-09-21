import type { Entity } from "../../entities/index";
import { buildDetectionInput, nextDetectionContext } from "../detection-window";
import { buildDetectionResultsUpdate } from "../session-detection-results";
import type { SessionRuntimeDetector, SessionRuntimeSnapshot, SessionRuntimeSnapshotPatch } from "./runtime-types";

type RuntimeDetectionLoopOptions = {
  detectIntervalMs: number;
  getSnapshot: () => SessionRuntimeSnapshot;
  updateSnapshot: (patch: SessionRuntimeSnapshotPatch) => void;
};

export class RuntimeDetectionLoop {
  private detector: SessionRuntimeDetector | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastDetectionKey = "";
  private previousDetectionContext = "";
  private processedTranscriptLength = 0;

  constructor(private readonly options: RuntimeDetectionLoopOptions) {}

  setDetector = (detector: SessionRuntimeDetector | null): void => void (this.detector = detector);

  appendTranscript(text: string): void {
    const { transcript } = this.options.getSnapshot();
    this.options.updateSnapshot({ transcript: transcript ? `${transcript} ${text}` : text });
  }

  activate(): void {
    this.processedTranscriptLength = this.options.getSnapshot().transcript.length;
    this.previousDetectionContext = "";
    this.startInterval();
  }

  pause(): void {
    this.previousDetectionContext = "";
    this.clearInterval();
  }

  reset(): void {
    this.processedTranscriptLength = 0;
    this.previousDetectionContext = "";
    this.lastDetectionKey = "";
    this.clearInterval();
  }

  dispose(): void {
    this.clearInterval();
  }

  processTranscript(): void {
    const snapshot = this.options.getSnapshot();
    if (snapshot.status !== "active" || !this.detector) return;
    const newText = snapshot.transcript.slice(this.processedTranscriptLength);
    if (!newText.trim()) return;

    const detectedEntities = this.detectEntities(snapshot.transcript, newText);
    const update = buildDetectionResultsUpdate(snapshot.cards, this.lastDetectionKey, detectedEntities);
    if (!update) return;
    if (update.detectionKey) this.lastDetectionKey = update.detectionKey;
    this.options.updateSnapshot(update.patch);
  }

  private detectEntities(transcript: string, newText: string): Entity[] {
    const detectionInput = buildDetectionInput(this.previousDetectionContext, newText);
    const detectedEntities = this.detector?.detect(detectionInput) ?? [];
    this.processedTranscriptLength = transcript.length;
    this.previousDetectionContext = nextDetectionContext(transcript);
    return detectedEntities;
  }

  private startInterval(): void {
    this.clearInterval();
    if (this.options.detectIntervalMs <= 0) return;
    this.interval = setInterval(() => this.processTranscript(), this.options.detectIntervalMs);
    (this.interval as { unref?: () => void }).unref?.();
  }

  private clearInterval(): void {
    if (!this.interval) return;
    clearInterval(this.interval);
    this.interval = null;
  }
}
