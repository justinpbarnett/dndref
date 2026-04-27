import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { EntityIndex, WorldDataProvider } from '../entities';
import { EntityDetector } from '../entities/detector';
import { FileUploadProvider } from '../entities/providers/file-upload';
import { GoogleDocsProvider } from '../entities/providers/google-docs';
import { HomebreweryProvider } from '../entities/providers/homebrewery';
import { KankaProvider } from '../entities/providers/kanka';
import { MarkdownProvider } from '../entities/providers/markdown';
import { NotionProvider, extractNotionId } from '../entities/providers/notion';
import { SRDProvider } from '../entities/providers/srd';
import { SAMPLE_WORLD } from '../sample-world';
import { useDataSources } from './data-sources';
import { DETECT_INTERVAL_MS, buildProvider, loadSettings } from './session-helpers';
import { SessionRuntime } from './session-runtime';
import type { EntityStatus, SessionContextType } from './session-types';
export { SessionStatus, SttStatus, EntityStatus, CardState } from './session-types';

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { settings: ds, uploadsVersion } = useDataSources();
  const [entityStatus, setEntityStatus] = useState<EntityStatus>('loading');
  const [entities, setEntities] = useState<EntityIndex>([]);
  const [runtime] = useState(() => new SessionRuntime({
    loadSttSettings: loadSettings,
    buildSttProvider: buildProvider,
    detectIntervalMs: DETECT_INTERVAL_MS,
  }));
  const [runtimeSnapshot, setRuntimeSnapshot] = useState(() => runtime.getSnapshot());
  const { status, sttStatus, sttError, sttProviderName, cards, transcript, recentDetections } = runtimeSnapshot;

  useEffect(() => {
    return runtime.subscribe(setRuntimeSnapshot);
  }, [runtime]);

  useEffect(() => {
    return () => {
      runtime.dispose();
    };
  }, [runtime]);

  useEffect(() => {
    let cancelled = false;
    setEntityStatus('loading');

    const providers: WorldDataProvider[] = [
      new MarkdownProvider(SAMPLE_WORLD, 'Sample World'),
      new FileUploadProvider(),
    ];
    if (ds.srdEnabled) providers.push(new SRDProvider(ds.srdSources));
    if (ds.kankaToken && ds.kankaCampaignId) {
      providers.push(new KankaProvider(ds.kankaToken, Number(ds.kankaCampaignId)));
    }
    if (ds.homebreweryUrl) providers.push(new HomebreweryProvider(ds.homebreweryUrl));
    if (ds.notionToken && ds.notionPageIds) {
      const ids = ds.notionPageIds.split(',').map((s) => extractNotionId(s.trim())).filter(Boolean);
      if (ids.length > 0) providers.push(new NotionProvider(ds.notionToken, ids));
    }
    if (ds.googleDocsUrl) providers.push(new GoogleDocsProvider(ds.googleDocsUrl));

    Promise.allSettled(providers.map((p) => p.load()))
      .then((results) => {
        if (cancelled) return;
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            console.warn(`[dnd-ref] ${providers[i].getName()} failed to load:`, r.reason);
          }
        });
        const combined = results.flatMap((r) => r.status === 'fulfilled' ? r.value : []);
        setEntities(combined);
        runtime.setDetector(new EntityDetector(combined));
        setEntityStatus(combined.length > 0 ? 'ready' : 'error');
      });

    return () => { cancelled = true; };
  }, [ds.srdEnabled, ds.srdSources.join(','), ds.kankaToken, ds.kankaCampaignId, ds.homebreweryUrl, ds.notionToken, ds.notionPageIds, ds.googleDocsUrl, uploadsVersion, runtime]);

  const start = useCallback(() => {
    void runtime.start();
  }, [runtime]);

  const pause = useCallback(() => {
    runtime.pause();
  }, [runtime]);

  const stop = useCallback(() => {
    runtime.stop();
  }, [runtime]);

  const appendTranscript = useCallback((text: string) => {
    runtime.appendTranscript(text);
  }, [runtime]);

  const pin = useCallback((instanceId: string) => {
    runtime.pin(instanceId);
  }, [runtime]);

  const unpin = useCallback((instanceId: string) => {
    runtime.unpin(instanceId);
  }, [runtime]);

  const dismiss = useCallback((instanceId: string) => {
    runtime.dismiss(instanceId);
  }, [runtime]);

  return (
    <SessionContext.Provider value={{
      status, sttStatus, sttError, sttProviderName, entityStatus,
      cards, entities, transcript, recentDetections,
      start, pause, stop, appendTranscript,
      pin, unpin, dismiss,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
