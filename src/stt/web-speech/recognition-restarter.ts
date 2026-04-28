import { getActionError, isAlreadyStartedError, isPermissionError } from "./recognition-errors";
import type { AnyRecognition } from "./recognition-types";

type RecognitionRestarterOptions = {
  getRecognition: () => AnyRecognition | null;
  isActive: () => boolean;
  onError: (error: string) => void;
  setActive: (active: boolean) => void;
};

export class RecognitionRestarter {
  private attempts = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: RecognitionRestarterOptions) {}

  resetAttempts = (): void => void (this.attempts = 0);

  clear(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  schedule(): void {
    if (!this.options.isActive() || !this.options.getRecognition() || this.timer !== null) return;
    const delay = Math.min(1000, 100 + this.attempts * 150);
    this.timer = setTimeout(() => this.tryRestart(), delay);
  }

  private tryRestart(): void {
    this.timer = null;
    const recognition = this.options.getRecognition();
    if (!this.options.isActive() || !recognition) return;
    try {
      recognition.start();
    } catch (e) {
      this.handleRestartError(e);
    }
  }

  private handleRestartError(error: unknown): void {
    if (isAlreadyStartedError(error)) return;
    this.attempts += 1;
    if (this.attempts < 5 && !isPermissionError(error)) {
      this.schedule();
      return;
    }
    this.options.setActive(false);
    this.options.onError(getActionError(error, "Mic paused. Tap Resume to continue listening.", "Failed to restart mic"));
  }
}
