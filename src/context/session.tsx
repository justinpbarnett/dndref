import React, { createContext, useContext, useEffect, useState } from "react";

import type { EntityIndex } from "../entities/index";
import { EntityDetector } from "../entities/detector";
import { useDataSources } from "./data-sources/provider";
import { buildWorldDataProviders, loadEntityIndex } from "./session-entity-sources";
import type { EntityStatus, SessionContextType } from "./session-types";
import { useSessionRuntimeController } from "./use-session-runtime-controller";

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { settings: ds, uploadsVersion } = useDataSources();
  const [entityStatus, setEntityStatus] = useState<EntityStatus>("loading");
  const [entities, setEntities] = useState<EntityIndex>([]);
  const runtimeController = useSessionRuntimeController();
  const { runtime, snapshot, start, pause, stop, appendTranscript, pin, unpin, dismiss } = runtimeController;
  const { status, sttStatus, sttError, sttProviderName, cards, transcript, recentDetections } = snapshot;

  useEffect(() => {
    let cancelled = false;
    setEntityStatus("loading");

    loadEntityIndex(buildWorldDataProviders(ds)).then((combined) => {
      if (cancelled) return;
      setEntities(combined);
      runtime.setDetector(new EntityDetector(combined));
      setEntityStatus(combined.length > 0 ? "ready" : "error");
    });

    return () => void (cancelled = true);
  }, [
    ds.srdEnabled,
    ds.srdSources.join(","),
    ds.kankaToken,
    ds.kankaCampaignId,
    ds.homebreweryUrl,
    ds.notionToken,
    ds.notionPageIds,
    ds.googleDocsUrl,
    uploadsVersion,
    runtime,
  ]);

  return (
    <SessionContext.Provider
      value={{
        status,
        sttStatus,
        sttError,
        sttProviderName,
        entityStatus,
        cards,
        entities,
        transcript,
        recentDetections,
        start,
        pause,
        stop,
        appendTranscript,
        pin,
        unpin,
        dismiss,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
