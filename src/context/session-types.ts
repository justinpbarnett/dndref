import { Entity, EntityIndex } from '../entities';

export type SessionStatus = 'idle' | 'active' | 'paused';
export type SttStatus = 'idle' | 'connecting' | 'active' | 'error';
export type EntityStatus = 'loading' | 'ready' | 'error';

export interface CardState {
  instanceId: string;
  entity: Entity;
  pinned: boolean;
}

export interface SessionContextType {
  status: SessionStatus;
  sttStatus: SttStatus;
  sttError: string | null;
  sttProviderName: string;
  entityStatus: EntityStatus;
  cards: CardState[];
  entities: EntityIndex;
  transcript: string;
  recentDetections: Entity[];
  start: () => void;
  pause: () => void;
  stop: () => void;
  appendTranscript: (text: string) => void;
  pin: (instanceId: string) => void;
  unpin: (instanceId: string) => void;
  dismiss: (instanceId: string) => void;
}
