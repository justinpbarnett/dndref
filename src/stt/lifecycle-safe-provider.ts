import type { STTProvider } from './index';

export type STTProviderFactory = (
  onTranscript: (text: string) => void,
  onError: (error: string) => void,
) => STTProvider;

type CaptureInstance = {
  generation: number;
  provider: STTProvider;
};

export class LateEventSafeSTTProvider implements STTProvider {
  readonly name: string;
  private activeGeneration: number | null = null;
  private current: CaptureInstance | null;
  private nextGeneration = 0;
  private startInFlight: Promise<void> | null = null;

  constructor(
    private readonly createProvider: STTProviderFactory,
    private readonly onTranscript: (text: string) => void,
    private readonly onError: (error: string) => void,
  ) {
    this.current = this.createInstance();
    this.name = this.current.provider.name;
  }

  start(): Promise<void> {
    if (this.startInFlight) return this.startInFlight;

    const instance = this.current ?? this.createInstance();
    this.current = instance;
    this.activeGeneration = null;

    let startup: Promise<void>;
    try {
      startup = Promise.resolve(instance.provider.start());
    } catch (error) {
      startup = Promise.reject(error);
    }

    const command = startup.then(
      () => {
        if (!this.isCurrent(instance)) return;
        this.activeGeneration = instance.generation;
      },
      (error: unknown) => {
        if (!this.isCurrent(instance)) return;
        this.current = null;
        this.activeGeneration = null;
        throw error;
      },
    );
    this.startInFlight = command;
    command.then(
      () => this.clearStartInFlight(command),
      () => this.clearStartInFlight(command),
    );
    return command;
  }

  pause(): Promise<void> { return this.invalidateAndStopCurrent(); }
  resume(): Promise<void> { return this.start(); }
  stop(): Promise<void> { return this.invalidateAndStopCurrent(); }

  private createInstance(): CaptureInstance {
    const generation = this.nextGeneration + 1;
    this.nextGeneration = generation;
    const provider = this.createProvider(
      (text) => this.emitTranscript(text, generation),
      (error) => this.emitError(error, generation),
    );
    return { generation, provider };
  }

  private emitTranscript(text: string, generation: number): void {
    if (this.canDeliver(generation)) this.onTranscript(text);
  }

  private emitError(error: string, generation: number): void {
    if (!this.canDeliver(generation)) return;
    this.activeGeneration = null;
    this.onError(error);
  }

  private canDeliver(generation: number): boolean {
    return this.activeGeneration === generation && this.current?.generation === generation;
  }

  private isCurrent(instance: CaptureInstance): boolean {
    return this.current === instance && this.current.generation === instance.generation;
  }

  private invalidateAndStopCurrent(): Promise<void> {
    const instance = this.current;
    this.current = null;
    this.activeGeneration = null;
    this.startInFlight = null;
    if (!instance) return Promise.resolve();
    return this.stopInstance(instance.provider);
  }

  private async stopInstance(provider: STTProvider): Promise<void> {
    try {
      await Promise.resolve(provider.stop());
    } catch {}
  }

  private clearStartInFlight(command: Promise<void>): void {
    if (this.startInFlight === command) this.startInFlight = null;
  }
}

export function createLateEventSafeSTTProvider(
  createProvider: STTProviderFactory,
  onTranscript: (text: string) => void,
  onError: (error: string) => void,
): STTProvider {
  return new LateEventSafeSTTProvider(createProvider, onTranscript, onError);
}
