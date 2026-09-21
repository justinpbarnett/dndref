import { CaptureSession } from "../../stt/capture-session";
import type { CaptureSessionState } from "../../stt/capture-session";
import type { SessionRuntimeOptions, SessionRuntimeSnapshotPatch } from "./runtime-types";

type RuntimeSttCallbacks = {
  appendTranscript: (text: string) => void;
  setSessionActive: (patch?: SessionRuntimeSnapshotPatch) => void;
  setSessionPaused: (patch?: SessionRuntimeSnapshotPatch) => void;
  updateSnapshot: (patch: SessionRuntimeSnapshotPatch) => void;
};

/**
 * Maps capture states onto session snapshot patches.
 *
 * `CaptureSession` owns the microphone. This class only translates. It holds no
 * generation counters and no provider handle, because the capture session
 * already drops late events from a capture the session no longer runs.
 */
export class RuntimeSttLifecycle {
  private readonly capture: CaptureSession;

  constructor(
    options: SessionRuntimeOptions,
    private readonly callbacks: RuntimeSttCallbacks,
  ) {
    this.capture = new CaptureSession({
      loadSettings: () => {
        const { loadSttSettings } = options;
        if (!loadSttSettings) return Promise.reject(new Error("STT provider factory not configured."));
        return loadSttSettings();
      },
      buildProvider: (settings, onTranscript, onError) => {
        const { buildSttProvider } = options;
        if (!buildSttProvider) throw new Error("STT provider factory not configured.");
        return buildSttProvider(settings, onTranscript, onError);
      },
      onTranscript: (text) => this.callbacks.appendTranscript(text),
      onState: (state) => this.apply(state),
    });
  }

  start = (): Promise<void> => this.capture.start();

  pause(): void {
    void this.capture.pause();
    this.callbacks.setSessionPaused({ sttStatus: "idle" });
  }

  stop(): void {
    void this.capture.stop();
  }

  private apply(state: CaptureSessionState): void {
    if (state.status === "connecting") {
      this.callbacks.updateSnapshot({
        sttStatus: "connecting",
        sttError: null,
        ...(state.providerName ? { sttProviderName: state.providerName } : {}),
      });
      return;
    }

    if (state.status === "active") {
      this.callbacks.setSessionActive({
        sttStatus: "active",
        sttError: null,
        sttProviderName: state.providerName,
      });
      return;
    }

    if (state.cause === "start") {
      this.callbacks.updateSnapshot({ sttProviderName: "", sttError: state.error, sttStatus: "error" });
      return;
    }

    this.callbacks.setSessionPaused({ sttError: state.error, sttStatus: "error" });
  }
}
