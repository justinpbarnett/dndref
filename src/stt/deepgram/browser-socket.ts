import { getErrorMessage } from "../../utils/error-message";
import { DEEPGRAM_PARAMS, DEEPGRAM_WS_URL, extractDeepgramFinalTranscript, getDeepgramCloseMessage } from "../deepgram-shared";
import { startBrowserDeepgramRecorder } from "./browser-recorder";

type BrowserDeepgramSocketOptions = {
  apiKey: string;
  cleanup: () => void;
  deactivate: () => void;
  getRecorderOptions: () => MediaRecorderOptions | undefined;
  getStream: () => MediaStream | null;
  isActive: () => boolean;
  onError: (error: string) => void;
  onTranscript: (text: string) => void;
  setRecorder: (recorder: MediaRecorder) => void;
  setSocket: (socket: WebSocket) => void;
};

export function connectDeepgramBrowserSocket(options: BrowserDeepgramSocketOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(`${DEEPGRAM_WS_URL}?${DEEPGRAM_PARAMS}`, ["token", options.apiKey]);
    options.setSocket(ws);
    let settled = false;

    const settle = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (err) {
        options.deactivate();
        options.cleanup();
        reject(err);
      } else {
        resolve();
      }
    };

    const timeout = setTimeout(
      () => settle(new Error("Deepgram connection timed out. Check your API key and network.")),
      10000,
    );

    ws.onopen = () => {
      const stream = options.getStream();
      if (!options.isActive() || !stream) {
        settle(new Error("Recording was stopped before Deepgram connected."));
        return;
      }
      startBrowserDeepgramRecorder(stream, ws, options, settle, () => settled);
    };

    ws.onmessage = (event) => handleDeepgramMessage(event.data as string, options);

    ws.onerror = () => {
      const err = new Error("Deepgram connection error. Check your API key and network.");
      if (!settled) {
        settle(err);
        return;
      }
      if (options.isActive()) options.onError(err.message);
    };

    ws.onclose = (event) => {
      const message = getDeepgramCloseMessage(event);
      if (!settled) {
        settle(new Error(message));
        return;
      }
      if (options.isActive()) {
        options.onError(message);
        options.deactivate();
        options.cleanup();
      }
    };
  });
}

function handleDeepgramMessage(message: string, options: BrowserDeepgramSocketOptions): void {
  try {
    const text = extractDeepgramFinalTranscript(message).trim();
    if (text && options.isActive()) options.onTranscript(text);
  } catch (e) {
    if (options.isActive()) {
      options.onError(`Unexpected Deepgram response: ${getErrorMessage(e)}`);
    }
  }
}
