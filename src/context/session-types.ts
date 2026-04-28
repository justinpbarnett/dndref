import { Entity, EntityIndex } from "../entities";

export type SessionStatus = "idle" | "active" | "paused";
export type SttStatus = "idle" | "connecting" | "active" | "error";
export type EntityStatus = "loading" | "ready" | "error";

export type CardState = { instanceId: string; entity: Entity; pinned: boolean };

export type SessionContextType = {
  status: SessionStatus;
  sttStatus: SttStatus;
  sttError: string | null;
  sttProviderName: string;
  entityStatus: EntityStatus;
  cards: CardState[];
  entities: EntityIndex;
  transcript: string;
  recentDetections: Entity[];
  appendTranscript: (text: string) => void;
} & Record<"start" | "pause" | "stop", () => void> &
  Record<"pin" | "unpin" | "dismiss", (instanceId: string) => void>;
