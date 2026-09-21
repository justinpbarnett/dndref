import { useCallback, useEffect, useState } from "react";

import { DETECTION_TUNING } from "../entities/detection-tuning";
import { buildProvider, loadSettings } from "../stt/build-provider";
import { SessionRuntime } from "./session-runtime";

export function useSessionRuntimeController() {
  const [runtime] = useState(
    () =>
      new SessionRuntime({
        loadSttSettings: loadSettings,
        buildSttProvider: buildProvider,
        detectIntervalMs: DETECTION_TUNING.intervalMs,
      }),
  );
  const [snapshot, setSnapshot] = useState(() => runtime.getSnapshot());

  useEffect(() => runtime.subscribe(setSnapshot), [runtime]);

  useEffect(() => () => runtime.dispose(), [runtime]);

  return {
    runtime,
    snapshot,
    start: useCallback(() => void runtime.start(), [runtime]),
    pause: useCallback(() => runtime.pause(), [runtime]),
    stop: useCallback(() => runtime.stop(), [runtime]),
    appendTranscript: useCallback((text: string) => runtime.appendTranscript(text), [runtime]),
    pin: useCallback((instanceId: string) => runtime.pin(instanceId), [runtime]),
    unpin: useCallback((instanceId: string) => runtime.unpin(instanceId), [runtime]),
    dismiss: useCallback((instanceId: string) => runtime.dismiss(instanceId), [runtime]),
  };
}
