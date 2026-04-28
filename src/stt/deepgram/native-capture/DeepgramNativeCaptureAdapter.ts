import { getErrorMessage } from "../../../utils/error-message";
import { DeepgramCaptureAdapterBase } from "../../deepgram-capture-base";
import { requestNativeRecordingAccess } from "../native-audio-recorder";
import { NativeChunkRecorder } from "../native-chunk-recorder";
import { transcribeNativeChunk } from "../native-transcription";

export class DeepgramNativeCaptureAdapter extends DeepgramCaptureAdapterBase {
  private readonly chunkRecorder = new NativeChunkRecorder({
    isActive: () => this.active,
    onChunkReady: (uri) => this.transcribeCompletedChunk(uri),
    onRecordingError: (error) => this.onError(`Recording error: ${error}`),
    setActive: (active) => void (this.active = active),
  });

  protected async startCapture(): Promise<void> {
    await requestNativeRecordingAccess();
    await this.chunkRecorder.start();
  }

  pause = (): Promise<void> => ((this.active = false), this.chunkRecorder.stop());

  resume = (): Promise<void> => ((this.active = true), this.chunkRecorder.start());

  stop = (): Promise<void> => this.pause();

  private transcribeCompletedChunk(uri: string): void {
    void transcribeNativeChunk(this.apiKey, uri)
      .then((text) => {
        if (text && this.active) this.onTranscript(text);
      })
      .catch((e: unknown) => {
        if (this.active) this.onError(`Transcription failed: ${getErrorMessage(e)}`);
      });
  }
}
