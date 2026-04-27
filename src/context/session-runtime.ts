import type { Entity } from '../entities';
import { addCard, dismissCard, pinCard, unpinCard } from './card-stack';
import { buildDetectionInput, nextDetectionContext } from './detection-window';
import type { CardState, SessionStatus } from './session-types';

export interface SessionRuntimeDetector {
  detect(transcript: string): Entity[];
}

export interface SessionRuntimeSnapshot {
  status: SessionStatus;
  cards: CardState[];
  transcript: string;
  recentDetections: Entity[];
}

type SessionRuntimeListener = (snapshot: SessionRuntimeSnapshot) => void;

export class SessionRuntime {
  private detector: SessionRuntimeDetector | null = null;
  private listeners = new Set<SessionRuntimeListener>();
  private lastDetectionKey = '';
  private previousDetectionContext = '';
  private processedTranscriptLength = 0;
  private snapshot: SessionRuntimeSnapshot = {
    status: 'idle',
    cards: [],
    transcript: '',
    recentDetections: [],
  };

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

  activate(): void {
    this.processedTranscriptLength = this.snapshot.transcript.length;
    this.previousDetectionContext = '';
    this.updateSnapshot({ status: 'active' });
  }

  pause(): void {
    this.previousDetectionContext = '';
    this.updateSnapshot({ status: 'paused' });
  }

  stop(): void {
    this.processedTranscriptLength = 0;
    this.previousDetectionContext = '';
    this.lastDetectionKey = '';
    this.updateSnapshot({
      status: 'idle',
      cards: [],
      transcript: '',
      recentDetections: [],
    });
  }

  appendTranscript(text: string): void {
    const transcript = this.snapshot.transcript ? `${this.snapshot.transcript} ${text}` : text;
    this.updateSnapshot({ transcript });
  }

  processTranscript(): void {
    if (this.snapshot.status !== 'active') return;
    if (!this.detector) return;

    const newText = this.snapshot.transcript.slice(this.processedTranscriptLength);
    if (!newText.trim()) return;

    const detectionInput = buildDetectionInput(this.previousDetectionContext, newText);
    const detectedEntities = this.detector.detect(detectionInput);
    this.processedTranscriptLength = this.snapshot.transcript.length;
    this.previousDetectionContext = nextDetectionContext(this.snapshot.transcript);

    if (detectedEntities.length === 0) return;

    let nextCards = this.snapshot.cards;
    for (const entity of detectedEntities) {
      nextCards = addCard(nextCards, entity);
    }

    const detectionKey = detectedEntities.map((entity) => entity.id).join(',');
    const recentDetectionsChanged = detectionKey !== this.lastDetectionKey;
    if (recentDetectionsChanged) {
      this.lastDetectionKey = detectionKey;
    }

    const cardsChanged = nextCards !== this.snapshot.cards;
    if (!cardsChanged && !recentDetectionsChanged) return;

    const snapshotPatch: Partial<SessionRuntimeSnapshot> = {};
    if (cardsChanged) snapshotPatch.cards = nextCards;
    if (recentDetectionsChanged) snapshotPatch.recentDetections = detectedEntities;
    this.updateSnapshot(snapshotPatch);
  }

  pin(instanceId: string): void {
    const cards = pinCard(this.snapshot.cards, instanceId);
    if (cards !== this.snapshot.cards) this.updateSnapshot({ cards });
  }

  unpin(instanceId: string): void {
    const cards = unpinCard(this.snapshot.cards, instanceId);
    if (cards !== this.snapshot.cards) this.updateSnapshot({ cards });
  }

  dismiss(instanceId: string): void {
    const cards = dismissCard(this.snapshot.cards, instanceId);
    if (cards !== this.snapshot.cards) this.updateSnapshot({ cards });
  }

  private updateSnapshot(patch: Partial<SessionRuntimeSnapshot>): void {
    if (Object.keys(patch).length === 0) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const snapshot = this.snapshot;
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
