import { getErrorMessage } from "../../utils/error-message";

type BrowserRecorderOptions = {
  getRecorderOptions: () => MediaRecorderOptions | undefined;
  isActive: () => boolean;
  onError: (error: string) => void;
  setRecorder: (recorder: MediaRecorder) => void;
};

export function startBrowserDeepgramRecorder(
  stream: MediaStream,
  ws: WebSocket,
  options: BrowserRecorderOptions,
  settle: (err?: Error) => void,
  isSettled: () => boolean,
): void {
  try {
    const recorder = new MediaRecorder(stream, options.getRecorderOptions());
    options.setRecorder(recorder);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
    };
    recorder.onerror = (event) => {
      const err = event instanceof ErrorEvent ? event.message : "Unknown recording error";
      if (!isSettled()) {
        settle(new Error(`Mic recording error: ${err}`));
        return;
      }
      if (options.isActive()) options.onError(`Mic recording error: ${err}`);
    };
    recorder.start(250);
    settle();
  } catch (e) {
    settle(new Error(`Failed to start browser recorder: ${getErrorMessage(e)}`));
  }
}
