import React, { createContext, useContext, useEffect, useState } from "react";

import { EntityDetector } from "../entities/detector";
import type { EntityIndex } from "../entities/index";
import { useDataSources } from "./data-sources/provider";
import { loadEntityIndex, dataSourcesSettingsKey } from "./session-entity-sources";
import type { EntityStatus, SessionContextType } from "./session-types";
import { useSessionRuntimeController } from "./use-session-runtime-controller";
import { rulesetFor } from "../rulesets/index";

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { settings: ds, uploadsVersion } = useDataSources();
  const [entityStatus, setEntityStatus] = useState<EntityStatus>("loading");
  const [entities, setEntities] = useState<EntityIndex>([]);
  const runtimeController = useSessionRuntimeController();
  const { runtime, snapshot, start, pause, stop, appendTranscript, pin, unpin, dismiss } = runtimeController;
  const { status, sttStatus, sttError, sttProviderName, cards, transcript, recentDetections } = snapshot;

  // Cards from the game that was being played are not cards in the one that is.
  // This is its own effect so that saving any other setting, which reloads the
  // index below, leaves the stack alone.
  useEffect(() => void runtime.clearCards(), [ds.rulesetId, runtime]);

  useEffect(() => {
    let cancelled = false;
    const ruleset = rulesetFor(ds.rulesetId);
    setEntityStatus("loading");

    loadEntityIndex(ruleset.providers(ds)).then((combined) => {
      if (cancelled) return;
      setEntities(combined);
      runtime.setDetector(new EntityDetector(combined, ruleset.matching));
      runtime.setHydrator(ruleset.hydrate ?? null);
      setEntityStatus(combined.length > 0 ? "ready" : "error");
    });

    return () => void (cancelled = true);
    // The settings key stands in for every field a ruleset could build a provider
    // from, so `src/rulesets` stays the one place a new source is added.
  }, [dataSourcesSettingsKey(ds), uploadsVersion, runtime]);

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
