/**
 * One detection pass, start to finish: what text the detector reads, where the
 * cursor lands afterwards, and which part of the snapshot the results change.
 *
 * Those three used to sit in three files, which hid the rule that ties them
 * together. A pass reads only the speech since the last one, and the cursor
 * advances only after the detector has answered, so nothing spoken during a
 * pass is skipped. A name can also arrive split across two passes, so each one
 * is fed the tail of the transcript before it. Whether the rejoined text then
 * matches is the detector's question, not this module's.
 */
import { DETECTION_TUNING } from "../../entities/detection-tuning";
import type { Entity } from "../../entities/index";
import { addCard } from "../card-stack";
import type { CardState } from "../session-types";
import type { SessionRuntimeDetector, SessionRuntimeSnapshot, SessionRuntimeSnapshotPatch } from "./runtime-types";

type RuntimeDetectionLoopOptions = {
  detectIntervalMs: number;
  getSnapshot: () => SessionRuntimeSnapshot;
  updateSnapshot: (patch: SessionRuntimeSnapshotPatch) => void;
  /** Told about the entities a pass put on the stack, so their text can be fetched. */
  onCardsAdded?: (entities: Entity[]) => void;
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
    if (detectedEntities.length === 0) return;

    const detectionKey = detectedEntities.map((entity) => entity.id).join(",");
    const patch = this.buildResultsPatch(snapshot.cards, detectedEntities, detectionKey);
    this.lastDetectionKey = detectionKey;
    if (!patch) return;

    this.options.updateSnapshot(patch);
    if (patch.cards) this.options.onCardsAdded?.(detectedEntities);
  }

  private detectEntities(transcript: string, newText: string): Entity[] {
    const carried = this.previousDetectionContext;
    const detectionInput = carried.trim() ? `${carried} ${newText}` : newText;
    const detectedEntities = this.detector?.detect(detectionInput) ?? [];
    this.processedTranscriptLength = transcript.length;
    this.previousDetectionContext = transcript.slice(-DETECTION_TUNING.carryOverChars);
    return detectedEntities;
  }

  /**
   * Cards and recent detections move on their own schedules. A name said twice
   * running changes neither, and a name already on the stack changes only the
   * recent detections. Each one is left out of the patch when it did not move,
   * so a caller comparing by identity sees a change only when there was one.
   *
   * This only reads the last reported key. Advancing it is the caller's job, so
   * asking what changed never changes the answer to asking again.
   */
  private buildResultsPatch(
    currentCards: CardState[],
    detectedEntities: Entity[],
    detectionKey: string,
  ): SessionRuntimeSnapshotPatch | null {
    let nextCards = currentCards;
    for (const entity of detectedEntities) nextCards = addCard(nextCards, entity);

    const cardsChanged = nextCards !== currentCards;
    const detectionsChanged = detectionKey !== this.lastDetectionKey;
    if (!cardsChanged && !detectionsChanged) return null;

    return {
      ...(cardsChanged ? { cards: nextCards } : {}),
      ...(detectionsChanged ? { recentDetections: detectedEntities } : {}),
    };
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
