import type { Entity } from '../entities';
import type { STTProvider, STTSettings } from '../stt';
import { addCard, dismissCard, pinCard, unpinCard } from './card-stack';
import { buildDetectionInput, nextDetectionContext } from './detection-window';
import type { CardState, SessionStatus, SttStatus } from './session-types';

export interface SessionRuntimeDetector {
  detect(transcript: string): Entity[];
}

export interface SessionRuntimeSnapshot {
  status: SessionStatus;
  sttStatus: SttStatus;
  sttError: string | null;
  sttProviderName: string;
  cards: CardState[];
  transcript: string;
  recentDetections: Entity[];
}

export interface SessionRuntimeOptions {
  loadSttSettings?: () => Promise<STTSettings>;
  buildSttProvider?: (settings: STTSettings, onTranscript: (text: string) => void, onError: (error: string) => void) => STTProvider;
  detectIntervalMs?: number;
}

type SessionRuntimeListener = (snapshot: SessionRuntimeSnapshot) => void;
type DetectionInterval = ReturnType<typeof setInterval>;

export class SessionRuntime {
  private acceptingTranscript = false;
  private detector: SessionRuntimeDetector | null = null;
  private detectionInterval: DetectionInterval | null = null;
  private readonly detectIntervalMs: number;
  private readonly buildSttProvider?: SessionRuntimeOptions['buildSttProvider'];
  private readonly loadSttSettings?: SessionRuntimeOptions['loadSttSettings'];
  private lastDetectionKey = '';
  private listeners = new Set<SessionRuntimeListener>();
  private previousDetectionContext = '';
  private processedTranscriptLength = 0;
  private startInFlight: Promise<void> | null = null;
  private sttGeneration = 0;
  private sttProvider: STTProvider | null = null;
  private snapshot: SessionRuntimeSnapshot = {
    status: 'idle',
    sttStatus: 'idle',
    sttError: null,
    sttProviderName: '',
    cards: [],
    transcript: '',
    recentDetections: [],
  };

  constructor(options: SessionRuntimeOptions = {}) {
    this.loadSttSettings = options.loadSttSettings;
    this.buildSttProvider = options.buildSttProvider;
    this.detectIntervalMs = options.detectIntervalMs ?? 0;
  }

  getSnapshot(): SessionRuntimeSnapshot { return this.snapshot; }

  subscribe(listener: SessionRuntimeListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  setDetector(detector: SessionRuntimeDetector | null): void { this.detector = detector; }

  start(): Promise<void> {
    if (this.startInFlight) return this.startInFlight;
    const command = this.sttProvider
      ? this.resumeExistingProvider(this.sttProvider, this.sttGeneration)
      : this.startNewProvider();
    this.startInFlight = command;
    const clearInFlight = () => { if (this.startInFlight === command) this.startInFlight = null; };
    command.then(clearInFlight, clearInFlight);
    return command;
  }

  resume(): Promise<void> { return this.start(); }
  activate(): void { this.activateSession(); }

  pause(): void {
    this.acceptingTranscript = false;
    const provider = this.sttProvider;
    if (provider) void Promise.resolve(provider.pause()).catch(() => {});
    this.pauseSession({ sttStatus: 'idle' });
  }

  stop(): void {
    const provider = this.invalidateStt();
    if (provider) void this.stopProvider(provider);
    this.stopSession({ sttStatus: 'idle', sttError: null, sttProviderName: '' });
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
    for (const entity of detectedEntities) nextCards = addCard(nextCards, entity);
    const detectionKey = detectedEntities.map((entity) => entity.id).join(',');
    const recentDetectionsChanged = detectionKey !== this.lastDetectionKey;
    if (recentDetectionsChanged) this.lastDetectionKey = detectionKey;

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

  private async startNewProvider(): Promise<void> {
    const generation = this.sttGeneration + 1;
    this.sttGeneration = generation;
    this.acceptingTranscript = false;
    this.updateSnapshot({ sttStatus: 'connecting', sttError: null });

    try {
      if (!this.loadSttSettings || !this.buildSttProvider) throw new Error('STT provider factory not configured.');
      const settings = await this.loadSttSettings();
      if (this.sttGeneration !== generation) return;
      const provider = this.buildSttProvider(
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
      this.activateSession({ sttStatus: 'active', sttError: null });
    } catch (e) {
      if (this.sttGeneration !== generation) return;
      const provider = this.sttProvider;
      if (provider) void this.stopProvider(provider);
      this.sttProvider = null;
      this.acceptingTranscript = false;
      this.updateSnapshot({
        sttProviderName: '',
        sttError: `Failed to start mic: ${this.formatError(e)}`,
        sttStatus: 'error',
      });
    }
  }

  private async resumeExistingProvider(provider: STTProvider, generation: number): Promise<void> {
    try {
      await Promise.resolve(provider.resume());
      if (this.sttGeneration !== generation || this.sttProvider !== provider) return;
      this.acceptingTranscript = true;
      this.activateSession({ sttStatus: 'active', sttError: null });
    } catch (e) {
      if (this.sttGeneration !== generation || this.sttProvider !== provider) return;
      this.acceptingTranscript = false;
      await this.stopProvider(provider);
      if (this.sttProvider === provider) this.sttProvider = null;
      this.pauseSession({
        sttError: `Failed to resume mic: ${this.formatError(e)}`,
        sttStatus: 'error',
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
    const patch = { sttError: error, sttStatus: 'error' as SttStatus };
    if (this.snapshot.status === 'active') this.pauseSession(patch);
    else this.updateSnapshot(patch);
  }

  private activateSession(patch: Partial<SessionRuntimeSnapshot> = {}): void {
    this.processedTranscriptLength = this.snapshot.transcript.length;
    this.previousDetectionContext = '';
    this.startDetectionInterval();
    this.updateSnapshot({ status: 'active', ...patch });
  }

  private pauseSession(patch: Partial<SessionRuntimeSnapshot> = {}): void {
    this.previousDetectionContext = '';
    this.clearDetectionInterval();
    this.updateSnapshot({ status: 'paused', ...patch });
  }

  private stopSession(patch: Partial<SessionRuntimeSnapshot> = {}): void {
    this.processedTranscriptLength = 0;
    this.previousDetectionContext = '';
    this.lastDetectionKey = '';
    this.clearDetectionInterval();
    this.updateSnapshot({ status: 'idle', cards: [], transcript: '', recentDetections: [], ...patch });
  }

  private startDetectionInterval(): void {
    this.clearDetectionInterval();
    if (this.detectIntervalMs <= 0) return;
    this.detectionInterval = setInterval(() => this.processTranscript(), this.detectIntervalMs);
    (this.detectionInterval as { unref?: () => void }).unref?.();
  }

  private clearDetectionInterval(): void {
    if (!this.detectionInterval) return;
    clearInterval(this.detectionInterval);
    this.detectionInterval = null;
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
    try { await Promise.resolve(provider.stop()); } catch {}
  }

  private formatError(error: unknown): string { return error instanceof Error ? error.message : String(error); }

  private updateSnapshot(patch: Partial<SessionRuntimeSnapshot>): void {
    if (Object.keys(patch).length === 0) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const snapshot = this.snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }
}
