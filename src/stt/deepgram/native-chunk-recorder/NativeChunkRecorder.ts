import { AsyncOperationQueue } from "../../../utils/async-operation-queue";
import { getErrorMessage } from "../../../utils/error-message";
import {
  startNativeAudioChunk,
  stopNativeAudioRecording,
  stopRecordingForUpload,
  type NativeAudioRecorder,
} from "../native-audio-recorder";

type NativeChunkRecorderOptions = {
  isActive: () => boolean;
  onChunkReady: (uri: string) => void;
  onRecordingError: (error: string) => void;
  setActive: (active: boolean) => void;
};

export class NativeChunkRecorder {
  private chunkTimer: ReturnType<typeof setInterval> | null = null;
  private readonly operations = new AsyncOperationQueue();
  private recording: NativeAudioRecorder | null = null;

  constructor(private readonly options: NativeChunkRecorderOptions) {}

  start = (): Promise<void> => this.operations.run(() => this.startNativeChunks());

  stop(): Promise<void> {
    return this.operations.run(async () => {
      this.clearNativeTimer();
      await this.stopCurrentRecording();
    });
  }

  private clearNativeTimer(): void {
    if (this.chunkTimer === null) return;
    clearInterval(this.chunkTimer);
    this.chunkTimer = null;
  }

  private async stopCurrentRecording(): Promise<void> {
    const recording = this.recording;
    this.recording = null;
    if (!recording) return;
    await stopNativeAudioRecording(recording, this.options.isActive());
  }

  private async startNativeChunks(): Promise<void> {
    if (!this.options.isActive() || this.recording) return;
    this.clearNativeTimer();
    await this.startChunk();
    if (this.options.isActive() && this.recording) {
      this.chunkTimer = setInterval(() => {
        void this.rotateChunk();
      }, 5000);
    }
  }

  private async startChunk(): Promise<void> {
    this.recording = await startNativeAudioChunk(() => this.options.isActive());
  }

  private async rotateChunk(): Promise<void> {
    await this.operations.run(async () => {
      if (!this.options.isActive() || !this.recording) return;
      const recording = this.recording;
      this.recording = null;
      try {
        const uri = await stopRecordingForUpload(recording);
        if (uri) this.options.onChunkReady(uri);
        if (this.options.isActive()) await this.startChunk();
      } catch (e) {
        if (this.options.isActive()) {
          this.options.onRecordingError(getErrorMessage(e));
          this.options.setActive(false);
          this.clearNativeTimer();
        }
      }
    });
  }
}
