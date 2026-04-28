import { stopMediaStream } from "./browser-media";

export class BrowserCaptureResources {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private ws: WebSocket | null = null;

  getStream = (): MediaStream | null => this.stream;
  setRecorder = (recorder: MediaRecorder): void => void (this.recorder = recorder);
  setSocket = (socket: WebSocket): void => void (this.ws = socket);
  setStream = (stream: MediaStream): void => void (this.stream = stream);

  pauseRecorder(): void {
    if (this.recorder?.state === "recording") this.recorder.pause();
  }

  resumePausedRecorder(): boolean {
    if (this.recorder?.state !== "paused" || this.ws?.readyState !== WebSocket.OPEN) return false;
    this.recorder.resume();
    return true;
  }

  cleanup(): void {
    this.stopRecorder();
    this.closeSocket();
    if (this.stream) stopMediaStream(this.stream);
    this.stream = null;
  }

  private stopRecorder(): void {
    const recorder = this.recorder;
    this.recorder = null;
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch {}
  }

  private closeSocket(): void {
    const ws = this.ws;
    this.ws = null;
    try {
      if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) ws.close();
    } catch {}
  }
}
