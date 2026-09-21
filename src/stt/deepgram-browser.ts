import { DeepgramCaptureAdapterBase } from "./deepgram-capture-base";
import { openMicrophoneStream } from "./deepgram/browser-media";
import { BrowserCaptureResources } from "./deepgram/browser-capture-resources";
import { connectDeepgramBrowserSocket } from "./deepgram/browser-socket";

export class DeepgramBrowserCaptureAdapter extends DeepgramCaptureAdapterBase {
  private readonly resources = new BrowserCaptureResources();

  pause = (): void => void ((this.active = false), this.resources.pauseRecorder());

  async resume(): Promise<void> {
    this.active = true;
    if (this.resources.resumePausedRecorder()) return;
    this.resources.cleanup();
    await this.startCapture();
  }

  stop = (): void => void ((this.active = false), this.resources.cleanup());

  private getRecorderOptions(): MediaRecorderOptions | undefined {
    if (typeof MediaRecorder === "undefined") return undefined;
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    return mimeType ? { mimeType } : undefined;
  }


  protected async startCapture(): Promise<void> {
    this.resources.setStream(await openMicrophoneStream(() => this.active));
    await connectDeepgramBrowserSocket({
      apiKey: this.apiKey,
      cleanup: () => this.resources.cleanup(),
      deactivate: () => void (this.active = false),
      getRecorderOptions: () => this.getRecorderOptions(),
      getStream: () => this.resources.getStream(),
      isActive: () => this.active,
      onError: (error) => this.onError(error),
      onTranscript: (text) => this.onTranscript(text),
      setRecorder: (recorder) => this.resources.setRecorder(recorder),
      setSocket: (socket) => this.resources.setSocket(socket),
    });
  }


}
