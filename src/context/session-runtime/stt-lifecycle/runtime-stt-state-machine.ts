import type { STTProvider } from "../../../stt";
import { getErrorMessage } from "../../../utils/error-message";
import { SingleFlight } from "../../../utils/single-flight";
import type { SessionRuntimeOptions, SessionRuntimeSnapshotPatch } from "../runtime-types";

type RuntimeSttCallbacks = {
  appendTranscript: (text: string) => void;
  setSessionActive: (patch?: SessionRuntimeSnapshotPatch) => void;
  setSessionPaused: (patch?: SessionRuntimeSnapshotPatch) => void;
  updateSnapshot: (patch: SessionRuntimeSnapshotPatch) => void;
};

export class RuntimeSttLifecycle {
  private acceptingTranscript = false;
  private generation = 0;
  private provider: STTProvider | null = null;
  private readonly starts = new SingleFlight();

  constructor(
    private readonly options: SessionRuntimeOptions,
    private readonly callbacks: RuntimeSttCallbacks,
  ) {}

  start(): Promise<void> {
    return this.starts.run(() =>
      this.provider ? this.resumeExistingProvider(this.provider, this.generation) : this.startNewProvider(),
    );
  }

  pause(): void {
    this.acceptingTranscript = false;
    const provider = this.provider;
    if (provider) void Promise.resolve(provider.pause()).catch(() => {});
    this.callbacks.setSessionPaused({ sttStatus: "idle" });
  }

  stop(): void {
    const provider = this.invalidate();
    if (provider) void this.stopProvider(provider);
  }

  private async startNewProvider(): Promise<void> {
    const generation = this.generation + 1;
    this.generation = generation;
    this.acceptingTranscript = false;
    this.callbacks.updateSnapshot({ sttStatus: "connecting", sttError: null });

    try {
      const { loadSttSettings, buildSttProvider } = this.options;
      if (!loadSttSettings || !buildSttProvider) throw new Error("STT provider factory not configured.");
      const settings = await loadSttSettings();
      if (this.generation !== generation) return;
      const provider = buildSttProvider(
        settings,
        (text) => this.acceptProviderTranscript(text, generation),
        (error) => this.handleProviderError(error, generation),
      );
      this.provider = provider;
      this.callbacks.updateSnapshot({ sttProviderName: provider.name });

      await provider.start();
      if (this.generation !== generation || this.provider !== provider) {
        await this.stopProvider(provider);
        return;
      }
      this.acceptingTranscript = true;
      this.callbacks.setSessionActive({ sttStatus: "active", sttError: null });
    } catch (e) {
      if (this.generation !== generation) return;
      const provider = this.provider;
      if (provider) void this.stopProvider(provider);
      this.provider = null;
      this.acceptingTranscript = false;
      this.callbacks.updateSnapshot({
        sttProviderName: "",
        sttError: `Failed to start mic: ${getErrorMessage(e)}`,
        sttStatus: "error",
      });
    }
  }

  private async resumeExistingProvider(provider: STTProvider, generation: number): Promise<void> {
    try {
      await Promise.resolve(provider.resume());
      if (this.generation !== generation || this.provider !== provider) return;
      this.acceptingTranscript = true;
      this.callbacks.setSessionActive({ sttStatus: "active", sttError: null });
    } catch (e) {
      if (this.generation !== generation || this.provider !== provider) return;
      this.acceptingTranscript = false;
      await this.stopProvider(provider);
      if (this.provider === provider) this.provider = null;
      this.callbacks.setSessionPaused({
        sttError: `Failed to resume mic: ${getErrorMessage(e)}`,
        sttStatus: "error",
      });
    }
  }

  private acceptProviderTranscript(text: string, generation: number): void {
    if (this.generation === generation && this.acceptingTranscript) this.callbacks.appendTranscript(text);
  }

  private handleProviderError(error: string, generation: number): void {
    if (this.generation !== generation) return;
    this.acceptingTranscript = false;
    const provider = this.provider;
    if (provider) void this.stopProvider(provider);
    this.provider = null;
    this.callbacks.setSessionPaused({ sttError: error, sttStatus: "error" });
  }

  private invalidate(): STTProvider | null {
    this.generation += 1;
    this.starts.reset();
    this.acceptingTranscript = false;
    const provider = this.provider;
    this.provider = null;
    return provider;
  }

  private async stopProvider(provider: STTProvider): Promise<void> {
    try {
      await Promise.resolve(provider.stop());
    } catch {}
  }
}
