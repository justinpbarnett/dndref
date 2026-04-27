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
  private detectionContext = '';
  private listeners = new Set<SessionRuntimeListener>();
  private prevDetectionKey = '';
  private processedUpTo = 0;
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
    this.processedUpTo = this.snapshot.transcript.length;
    this.detectionContext = '';
    this.replaceSnapshot({ status: 'active' });
  }

  pause(): void {
    this.detectionContext = '';
    this.replaceSnapshot({ status: 'paused' });
  }

  stop(): void {
    this.processedUpTo = 0;
    this.detectionContext = '';
    this.prevDetectionKey = '';
    this.replaceSnapshot({
      status: 'idle',
      cards: [],
      transcript: '',
      recentDetections: [],
    });
  }

  appendTranscript(text: string): void {
    const transcript = this.snapshot.transcript ? `${this.snapshot.transcript} ${text}` : text;
    this.replaceSnapshot({ transcript });
  }

  processTranscript(): void {
    if (this.snapshot.status !== 'active') return;
    if (!this.detector) return;

    const newText = this.snapshot.transcript.slice(this.processedUpTo);
    if (!newText.trim()) return;

    const found = this.detector.detect(buildDetectionInput(this.detectionContext, newText));
    this.processedUpTo = this.snapshot.transcript.length;
    this.detectionContext = nextDetectionContext(this.snapshot.transcript);

    if (found.length === 0) return;

    let cards = this.snapshot.cards;
    for (const entity of found) {
      cards = addCard(cards, entity);
    }

    const detectionKey = found.map((entity) => entity.id).join(',');
    const shouldUpdateRecentDetections = detectionKey !== this.prevDetectionKey;
    if (shouldUpdateRecentDetections) {
      this.prevDetectionKey = detectionKey;
    }

    this.replaceSnapshot({
      ...(cards !== this.snapshot.cards ? { cards } : {}),
      ...(shouldUpdateRecentDetections ? { recentDetections: found } : {}),
    });
  }

  pin(instanceId: string): void {
    const cards = pinCard(this.snapshot.cards, instanceId);
    if (cards !== this.snapshot.cards) this.replaceSnapshot({ cards });
  }

  unpin(instanceId: string): void {
    const cards = unpinCard(this.snapshot.cards, instanceId);
    if (cards !== this.snapshot.cards) this.replaceSnapshot({ cards });
  }

  dismiss(instanceId: string): void {
    const cards = dismissCard(this.snapshot.cards, instanceId);
    if (cards !== this.snapshot.cards) this.replaceSnapshot({ cards });
  }

  private replaceSnapshot(patch: Partial<SessionRuntimeSnapshot>): void {
    if (Object.keys(patch).length === 0) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit(): void {
    const snapshot = this.snapshot;
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
