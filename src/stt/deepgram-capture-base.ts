import { assertDeepgramApiKey } from "./deepgram-shared";

export abstract class DeepgramCaptureAdapterBase {
  readonly name = "Deepgram";
  protected active = false;

  constructor(
    protected readonly apiKey: string,
    protected readonly onTranscript: (text: string) => void,
    protected readonly onError: (error: string) => void,
  ) {}

  async start(): Promise<void> {
    assertDeepgramApiKey(this.apiKey);
    this.active = true;
    await this.startCapture();
  }

  protected abstract startCapture(): Promise<void>;
}
