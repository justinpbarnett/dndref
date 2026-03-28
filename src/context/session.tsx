import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Entity, EntityIndex, WorldDataProvider } from '../entities';
import { EntityDetector } from '../entities/detector';
import { MarkdownProvider } from '../entities/providers/markdown';
import { SRDProvider } from '../entities/providers/srd';
import { KankaProvider } from '../entities/providers/kanka';
import { HomebreweryProvider } from '../entities/providers/homebrewery';
import { NotionProvider, extractNotionId } from '../entities/providers/notion';
import { GoogleDocsProvider } from '../entities/providers/google-docs';
import { FileUploadProvider } from '../entities/providers/file-upload';
import { SAMPLE_WORLD } from '../sample-world';
import { STTProvider } from '../stt/index';
import { useDataSources } from './data-sources';
import { SessionStatus, SttStatus, EntityStatus, CardState, SessionContextType } from './session-types';
export { SessionStatus, SttStatus, EntityStatus, CardState } from './session-types';
import {
  MAX_CARDS,
  DETECT_INTERVAL_MS,
  addCard,
  pinCard,
  unpinCard,
  dismissCard,
  loadSettings,
  buildProvider,
} from './session-helpers';

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { settings: ds, uploadsVersion } = useDataSources();
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [sttStatus, setSttStatus] = useState<SttStatus>('idle');
  const [sttError, setSttError] = useState<string | null>(null);
  const [sttProviderName, setSttProviderName] = useState('');
  const [entityStatus, setEntityStatus] = useState<EntityStatus>('loading');
  const [cards, setCards] = useState<CardState[]>([]);
  const [entities, setEntities] = useState<EntityIndex>([]);
  const [transcript, setTranscript] = useState('');
  const [recentDetections, setRecentDetections] = useState<Entity[]>([]);
  const detectorRef = useRef<EntityDetector | null>(null);
  const transcriptRef = useRef('');
  const processedUpToRef = useRef(0);
  const prevDetectionKeyRef = useRef('');
  const sttRef = useRef<STTProvider | null>(null);

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
        detectorRef.current = new EntityDetector(combined);
        setEntityStatus(combined.length > 0 ? 'ready' : 'error');
      });

    return () => { cancelled = true; };
  }, [ds.srdEnabled, ds.srdSources.join(','), ds.kankaToken, ds.kankaCampaignId, ds.homebreweryUrl, ds.notionToken, ds.notionPageIds, ds.googleDocsUrl, uploadsVersion]);

  useEffect(() => {
    if (status !== 'active') return;

    const interval = setInterval(() => {
      const detector = detectorRef.current;
      if (!detector) return;

      const newText = transcriptRef.current.slice(processedUpToRef.current);
      if (!newText.trim()) return;

      const found = detector.detect(newText);
      processedUpToRef.current = transcriptRef.current.length;

      if (found.length === 0) return;

      const detectionKey = found.map((e) => e.id).sort().join(',');
      if (detectionKey !== prevDetectionKeyRef.current) {
        prevDetectionKeyRef.current = detectionKey;
        setRecentDetections(found);
      }

      setCards((prev) => {
        let next = prev;
        found.forEach((entity) => { next = addCard(next, entity); });
        return next;
      });
    }, DETECT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status]);

  const appendTranscript = useCallback((text: string) => {
    setTranscript((prev) => {
      const next = prev ? `${prev} ${text}` : text;
      transcriptRef.current = next;
      return next;
    });
  }, []);

  const start = useCallback(async () => {
    if (sttRef.current) {
      sttRef.current.resume();
      setStatus('active');
      setSttStatus('active');
      processedUpToRef.current = transcriptRef.current.length;
      return;
    }

    setSttStatus('connecting');
    setSttError(null);

    const settings = await loadSettings();
    const provider = buildProvider(
      settings,
      appendTranscript,
      (err) => {
        sttRef.current?.stop();
        sttRef.current = null;
        setSttError(err);
        setSttStatus('error');
        setStatus((prev) => prev === 'active' ? 'paused' : prev);
      },
    );

    sttRef.current = provider;
    setSttProviderName(provider.name);

    try {
      await provider.start();
    } catch (e) {
      setSttError(`Failed to start mic: ${e instanceof Error ? e.message : String(e)}`);
      setSttStatus('error');
      sttRef.current = null;
      return;
    }

    setSttStatus('active');
    setStatus('active');
    processedUpToRef.current = transcriptRef.current.length;
  }, [appendTranscript]);

  const pause = useCallback(() => {
    sttRef.current?.pause();
    setSttStatus('idle');
    setStatus('paused');
  }, []);

  const stop = useCallback(() => {
    sttRef.current?.stop();
    sttRef.current = null;
    setSttStatus('idle');
    setSttError(null);
    setSttProviderName('');
    setStatus('idle');
    setCards([]);
    setTranscript('');
    transcriptRef.current = '';
    setRecentDetections([]);
    prevDetectionKeyRef.current = '';
    processedUpToRef.current = 0;
  }, []);

  const pin = useCallback((instanceId: string) => {
    setCards((prev) => pinCard(prev, instanceId));
  }, []);

  const unpin = useCallback((instanceId: string) => {
    setCards((prev) => unpinCard(prev, instanceId));
  }, []);

  const dismiss = useCallback((instanceId: string) => {
    setCards((prev) => dismissCard(prev, instanceId));
  }, []);

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
