import type { Entity } from "../../entities";
import type { STTProvider, STTSettings } from "../../stt";
import type { CardState, SessionStatus, SttStatus } from "../session-types";

export type SessionRuntimeDetector = { detect(transcript: string): Entity[] };

export type SessionRuntimeSnapshot = {
  status: SessionStatus;
  sttStatus: SttStatus;
  sttError: string | null;
  cards: CardState[];
  recentDetections: Entity[];
} & Record<"sttProviderName" | "transcript", string>;

export type SessionRuntimeSnapshotPatch = Partial<SessionRuntimeSnapshot>;

export const INITIAL_SESSION_RUNTIME_SNAPSHOT: SessionRuntimeSnapshot = {
  status: "idle",
  sttStatus: "idle",
  sttError: null,
  sttProviderName: "",
  cards: [],
  transcript: "",
  recentDetections: [],
};

export interface SessionRuntimeOptions {
  loadSttSettings?: () => Promise<STTSettings>;
  buildSttProvider?: (
    settings: STTSettings,
    onTranscript: (text: string) => void,
    onError: (error: string) => void,
  ) => STTProvider;
  detectIntervalMs?: number;
}
