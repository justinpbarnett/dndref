import { SingleFlight } from "../../utils/single-flight";
import type { STTProvider } from "../index";

export type STTProviderFactory = (
  onTranscript: (text: string) => void,
  onError: (error: string) => void,
) => STTProvider;

type CaptureInstance = { readonly generation: number; readonly provider: STTProvider };

export class LateEventSafeSTTProvider implements STTProvider {
  readonly name: string;
  private currentCapture: CaptureInstance | null;
  private deliveryGeneration: number | null = null;
  private nextGeneration = 0;
  private readonly starts = new SingleFlight();

  constructor(
    private readonly createProvider: STTProviderFactory,
    private readonly onTranscript: (text: string) => void,
    private readonly onError: (error: string) => void,
  ) {
    this.currentCapture = this.createCapture();
    this.name = this.currentCapture.provider.name;
  }

  start(): Promise<void> {
    return this.starts.run(() => {
      const capture = this.currentCapture ?? this.createCapture();
      this.currentCapture = capture;
      this.deliveryGeneration = null;
      return this.startCapture(capture);
    });
  }

  pause = (): Promise<void> => this.stopCurrentCapture();
  resume = (): Promise<void> => this.start();
  stop = (): Promise<void> => this.stopCurrentCapture();

  private createCapture(): CaptureInstance {
    this.nextGeneration += 1;
    const generation = this.nextGeneration;
    const provider = this.createProvider(
      (text) => this.emitTranscript(text, generation),
      (error) => this.emitError(error, generation),
    );
    return { generation, provider };
  }

  private startCapture(capture: CaptureInstance): Promise<void> {
    let startup: Promise<void>;
    try {
      startup = Promise.resolve(capture.provider.start());
    } catch (error) {
      startup = Promise.reject(error);
    }

    return startup.then(
      () => {
        if (!this.isCurrentCapture(capture)) return;
        this.deliveryGeneration = capture.generation;
      },
      (error: unknown) => {
        if (!this.isCurrentCapture(capture)) return;
        this.currentCapture = null;
        this.deliveryGeneration = null;
        throw error;
      },
    );
  }

  private emitTranscript(text: string, generation: number): void {
    if (this.canDeliver(generation)) this.onTranscript(text);
  }

  private emitError(error: string, generation: number): void {
    if (!this.canDeliver(generation)) return;
    this.deliveryGeneration = null;
    this.onError(error);
  }

  private canDeliver = (generation: number): boolean =>
    this.deliveryGeneration === generation && this.currentCapture?.generation === generation;

  private isCurrentCapture = (capture: CaptureInstance): boolean => this.currentCapture === capture;

  private stopCurrentCapture(): Promise<void> {
    const capture = this.currentCapture;
    this.currentCapture = null;
    this.deliveryGeneration = null;
    this.starts.reset();
    if (!capture) return Promise.resolve();
    return this.stopProvider(capture.provider);
  }

  private async stopProvider(provider: STTProvider): Promise<void> {
    try {
      await provider.stop();
    } catch {}
  }
}

export function createLateEventSafeSTTProvider(
  createProvider: STTProviderFactory,
  onTranscript: (text: string) => void,
  onError: (error: string) => void,
): STTProvider {
  return new LateEventSafeSTTProvider(createProvider, onTranscript, onError);
}
