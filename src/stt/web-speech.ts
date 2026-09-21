import { STTProvider } from "./index";
import { getActionError, isAlreadyStartedError } from "./web-speech/recognition-errors";
import { createStartedRecognition } from "./web-speech/recognition-instance";
import { RecognitionRestarter } from "./web-speech/recognition-restarter";
import type { AnyRecognition } from "./web-speech/recognition-types";

export class WebSpeechProvider implements STTProvider {
  readonly name = "Web Speech";
  private recognition: AnyRecognition | null = null;
  private active = false;
  private readonly restarter = new RecognitionRestarter({
    getRecognition: () => this.recognition,
    isActive: () => this.active,
    onError: (error) => this.onError(error),
    setActive: (active) => void (this.active = active),
  });
  private onTranscript: (text: string) => void;
  private onError: (error: string) => void;

  constructor(onTranscript: (text: string) => void, onError: (error: string) => void) {
    this.onTranscript = onTranscript;
    this.onError = onError;
  }

  async start(): Promise<void> {
    this.active = true;
    this.restarter.resetAttempts();
    try {
      this.recognition = createStartedRecognition({
        onEnd: () => this.restarter.schedule(),
        onError: (error) => this.onError(error),
        onFatalError: () => void (this.active = false),
        onFinalTranscript: (text) => this.onTranscript(text),
        onResult: () => this.restarter.resetAttempts(),
      });
    } catch (e) {
      this.active = false;
      this.recognition = null;
      throw e;
    }
  }

  pause(): void {
    this.active = false;
    this.restarter.clear();
    try {
      this.recognition?.abort();
    } catch {}
  }

  resume(): void {
    this.active = true;
    this.restarter.resetAttempts();
    this.restarter.clear();
    try {
      this.recognition?.start();
    } catch (e) {
      if (isAlreadyStartedError(e)) return;
      this.active = false;
      this.onError(
        getActionError(
          e,
          "Mic permission required. Allow microphone access in browser settings.",
          "Failed to resume mic",
        ),
      );
    }
  }

  stop(): void {
    this.active = false;
    this.restarter.clear();
    try {
      this.recognition?.abort();
    } catch {}
    this.recognition = null;
  }
}
