import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import type { EntityIndex, WorldDataProvider } from '../entities';
import { useDataSources } from './data-sources';
import {
  DETECT_INTERVAL_MS,
  loadSettings,
  buildProvider,
} from './session-helpers';
import { SessionRuntime } from './session-runtime';
import type { SttStatus, EntityStatus, SessionContextType } from './session-types';
import { EntityDetector } from '../entities/detector';
import { FileUploadProvider } from '../entities/providers/file-upload';
import { GoogleDocsProvider } from '../entities/providers/google-docs';
import { HomebreweryProvider } from '../entities/providers/homebrewery';
import { KankaProvider } from '../entities/providers/kanka';
import { MarkdownProvider } from '../entities/providers/markdown';
import { NotionProvider, extractNotionId } from '../entities/providers/notion';
import { SRDProvider } from '../entities/providers/srd';
import { SAMPLE_WORLD } from '../sample-world';
import type { STTProvider } from '../stt/index';
export { SessionStatus, SttStatus, EntityStatus, CardState } from './session-types';

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { settings: ds, uploadsVersion } = useDataSources();
  const [sttStatus, setSttStatus] = useState<SttStatus>('idle');
  const [sttError, setSttError] = useState<string | null>(null);
  const [sttProviderName, setSttProviderName] = useState('');
  const [entityStatus, setEntityStatus] = useState<EntityStatus>('loading');
  const [entities, setEntities] = useState<EntityIndex>([]);
  const runtimeRef = useRef<SessionRuntime | null>(null);
  if (!runtimeRef.current) runtimeRef.current = new SessionRuntime();
  const runtime = runtimeRef.current;
  const [runtimeSnapshot, setRuntimeSnapshot] = useState(() => runtime.getSnapshot());
  const { status, cards, transcript, recentDetections } = runtimeSnapshot;
  const sttRef = useRef<STTProvider | null>(null);
  const sttGenerationRef = useRef(0);
  const startInFlightRef = useRef<Promise<void> | null>(null);
  const acceptingTranscriptRef = useRef(false);

  useEffect(() => runtime.subscribe(setRuntimeSnapshot), [runtime]);

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

  useEffect(() => {
    if (status !== 'active') return;

    const interval = setInterval(() => {
      runtime.processTranscript();
    }, DETECT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [runtime, status]);

  const appendTranscript = useCallback((text: string) => {
    runtime.appendTranscript(text);
  }, [runtime]);

  const start = useCallback(async () => {
    if (startInFlightRef.current) return;

    if (sttRef.current) {
      const generation = sttGenerationRef.current;
      const provider = sttRef.current;
      const resumePromise = Promise.resolve()
        .then(() => provider.resume())
        .then(() => {
          if (sttGenerationRef.current !== generation || sttRef.current !== provider) return;
          acceptingTranscriptRef.current = true;
          runtime.activate();
          setSttStatus('active');
        })
        .catch((e) => {
          if (sttGenerationRef.current !== generation || sttRef.current !== provider) return;
          acceptingTranscriptRef.current = false;
          Promise.resolve(provider.stop()).catch(() => {});
          sttRef.current = null;
          setSttError(`Failed to resume mic: ${e instanceof Error ? e.message : String(e)}`);
          setSttStatus('error');
          runtime.pause();
        })
        .finally(() => {
          if (startInFlightRef.current === resumePromise) startInFlightRef.current = null;
        });
      startInFlightRef.current = resumePromise;
      return;
    }

    const generation = sttGenerationRef.current + 1;
    sttGenerationRef.current = generation;
    acceptingTranscriptRef.current = false;
    setSttStatus('connecting');
    setSttError(null);

    const startPromise = (async () => {
      const settings = await loadSettings();
      if (sttGenerationRef.current !== generation) return;

      const provider = buildProvider(
        settings,
        (text) => {
          if (sttGenerationRef.current === generation && acceptingTranscriptRef.current) {
            appendTranscript(text);
          }
        },
        (err) => {
          if (sttGenerationRef.current !== generation) return;
          acceptingTranscriptRef.current = false;
          const current = sttRef.current;
          if (current) Promise.resolve(current.stop()).catch(() => {});
          sttRef.current = null;
          setSttError(err);
          setSttStatus('error');
          if (runtime.getSnapshot().status === 'active') runtime.pause();
        },
      );

      sttRef.current = provider;
      setSttProviderName(provider.name);

      await provider.start();
      if (sttGenerationRef.current !== generation || sttRef.current !== provider) {
        await provider.stop();
        return;
      }

      acceptingTranscriptRef.current = true;
      setSttStatus('active');
      runtime.activate();
    })()
      .catch((e) => {
        if (sttGenerationRef.current !== generation) return;
        const provider = sttRef.current;
        if (provider) Promise.resolve(provider.stop()).catch(() => {});
        sttRef.current = null;
        acceptingTranscriptRef.current = false;
        setSttProviderName('');
        setSttError(`Failed to start mic: ${e instanceof Error ? e.message : String(e)}`);
        setSttStatus('error');
      })
      .finally(() => {
        if (startInFlightRef.current === startPromise) startInFlightRef.current = null;
      });

    startInFlightRef.current = startPromise;
  }, [appendTranscript, runtime]);

  const pause = useCallback(() => {
    acceptingTranscriptRef.current = false;
    const provider = sttRef.current;
    if (provider) Promise.resolve(provider.pause()).catch(() => {});
    setSttStatus('idle');
    runtime.pause();
  }, [runtime]);

  const stop = useCallback(() => {
    sttGenerationRef.current += 1;
    startInFlightRef.current = null;
    acceptingTranscriptRef.current = false;
    const provider = sttRef.current;
    if (provider) Promise.resolve(provider.stop()).catch(() => {});
    sttRef.current = null;
    setSttStatus('idle');
    setSttError(null);
    setSttProviderName('');
    runtime.stop();
  }, [runtime]);

  useEffect(() => {
    return () => {
      sttGenerationRef.current += 1;
      acceptingTranscriptRef.current = false;
      const provider = sttRef.current;
      if (provider) Promise.resolve(provider.stop()).catch(() => {});
      sttRef.current = null;
    };
  }, []);

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
