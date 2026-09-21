import { getErrorMessage } from "../utils/error-message";
import { SingleFlight } from "../utils/single-flight";

import type { STTProvider, STTSettings } from "./index";

/**
 * What the caller learns about a capture without asking.
 *
 * Caller-initiated transitions stay silent: the caller that called `pause` or
 * `stop` already knows the outcome. `cause` separates a capture that never
 * started from one that failed while running, because the two ask the session
 * for different things.
 */
export type CaptureSessionState =
  | { status: "connecting"; providerName: string }
  | { status: "active"; providerName: string }
  | { status: "error"; error: string; cause: "start" | "capture" };

export type CaptureProviderFactory = (
  settings: STTSettings,
  onTranscript: (text: string) => void,
  onError: (error: string) => void,
) => STTProvider;

export type CaptureSessionOptions = {
  loadSettings: () => Promise<STTSettings>;
  buildProvider: CaptureProviderFactory;
  onTranscript: (text: string) => void;
  onState: (state: CaptureSessionState) => void;
};

type Capture = { readonly generation: number; readonly provider: STTProvider };

/**
 * One microphone capture, from the first `start` to the last `stop`.
 *
 * Interface contract:
 * - `start` resumes the held provider, or loads settings and builds one when
 *   none is held. Concurrent calls share the attempt. A failure arrives
 *   through `onState`, never as a rejection.
 * - `pause` holds the provider and asks it to pause. Transcripts stop.
 * - `stop` drops the provider. The next `start` builds another.
 * - Events from a superseded capture never reach `onTranscript` or `onState`.
 */
export class CaptureSession {
  private capture: Capture | null = null;
  private delivering = false;
  private generation = 0;
  private readonly starts = new SingleFlight();

  constructor(private readonly options: CaptureSessionOptions) {}

  start = (): Promise<void> => {
    const held = this.capture;
    return this.starts.run(() => (held ? this.reopen(held) : this.open()));
  };

  async pause(): Promise<void> {
    const capture = this.capture;
    this.delivering = false;
    this.starts.reset();
    if (!capture) return;
    try {
      await capture.provider.pause();
    } catch (e) {
      await this.discard(capture, "Failed to pause mic", e);
    }
  }

  async stop(): Promise<void> {
    const capture = this.capture;
    this.capture = null;
    this.delivering = false;
    this.generation += 1;
    this.starts.reset();
    if (capture) await this.stopQuietly(capture.provider);
  }

  private async reopen(capture: Capture): Promise<void> {
    try {
      await capture.provider.resume();
      if (!this.isCurrent(capture)) return;
      this.delivering = true;
      this.announce({ status: "active", providerName: capture.provider.name });
    } catch (e) {
      await this.discard(capture, "Failed to resume mic", e);
    }
  }

  private async open(): Promise<void> {
    const generation = (this.generation += 1);
    this.delivering = false;
    this.announce({ status: "connecting", providerName: "" });

    let capture: Capture | null = null;
    try {
      const settings = await this.options.loadSettings();
      if (this.generation !== generation) return;

      const provider = this.options.buildProvider(
        settings,
        (text) => this.deliverTranscript(text, generation),
        (error) => this.deliverError(error, generation),
      );
      capture = { generation, provider };
      this.capture = capture;
      this.announce({ status: "connecting", providerName: provider.name });

      await provider.start();
      if (!this.isCurrent(capture)) return;
      this.delivering = true;
      this.announce({ status: "active", providerName: provider.name });
    } catch (e) {
      if (this.generation !== generation) return;
      if (capture) {
        this.capture = null;
        await this.stopQuietly(capture.provider);
      }
      this.delivering = false;
      this.announce({ status: "error", cause: "start", error: `Failed to start mic: ${getErrorMessage(e)}` });
    }
  }

  private async discard(capture: Capture, label: string, e: unknown): Promise<void> {
    if (!this.isCurrent(capture)) return;
    this.capture = null;
    this.delivering = false;
    await this.stopQuietly(capture.provider);
    this.announce({ status: "error", cause: "capture", error: `${label}: ${getErrorMessage(e)}` });
  }

  private deliverTranscript(text: string, generation: number): void {
    if (this.canDeliver(generation)) this.options.onTranscript(text);
  }

  private deliverError(error: string, generation: number): void {
    if (!this.canDeliver(generation)) return;
    const capture = this.capture;
    this.capture = null;
    this.delivering = false;
    if (capture) void this.stopQuietly(capture.provider);
    this.announce({ status: "error", cause: "capture", error });
  }

  private canDeliver = (generation: number): boolean =>
    this.delivering && this.generation === generation && this.capture?.generation === generation;

  private isCurrent = (capture: Capture): boolean => this.capture === capture;

  private announce = (state: CaptureSessionState): void => this.options.onState(state);

  private async stopQuietly(provider: STTProvider): Promise<void> {
    try {
      await provider.stop();
    } catch {}
  }
}
