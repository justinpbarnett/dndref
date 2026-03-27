# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# DnD Ref

Expo + React Native app (web + iOS) that listens at the D&D table and pops up entity cards (NPCs, locations, factions, items) when entities are mentioned. No AI in the live path. Fuzzy string matching runs every 2 seconds against a static world export loaded at session start.

Live at dndref.com (Cloudflare Pages).

## Key commands

```
just dev            # web dev server
just start          # Expo with QR code for iPad/Expo Go
just check          # TypeScript typecheck
just build-web      # export static web build to dist/
just ship-web       # build + deploy to Cloudflare Pages in one step
just proxy-dev      # run CORS proxy locally at :8787
just proxy-deploy   # deploy CORS proxy to Cloudflare Workers
just screenshot     # Playwright screenshot tests (requires a built dist/)
just build-ios      # EAS build for TestFlight/App Store
just submit-ios     # submit latest build to App Store
```

Playwright tests need a production-like build: `just build-web && just screenshot`.

## Architecture

### Context provider hierarchy

Three nested providers wrap the entire app (see `app/_layout.tsx`):

1. `UISettingsProvider` (`src/context/ui-settings.tsx`) -- card size (S/M/L/XL) and color scheme (dark/light/system). On web, reads from `localStorage` synchronously to avoid hydration flicker; on native, reads from `AsyncStorage` on mount.
2. `DataSourcesProvider` (`src/context/data-sources.tsx`) -- stores API credentials and source URLs in `AsyncStorage`. Exposes `uploadsVersion` counter that increments when a file is uploaded, triggering entity reload.
3. `SessionProvider` (`src/context/session.tsx`) -- owns the session lifecycle (idle/active/paused), the running STT provider, the entity detector, and the card stack.

### Entity detection pipeline

`SessionProvider` loads all configured `WorldDataProvider`s in parallel at startup (and again whenever `DataSourcesSettings` or `uploadsVersion` changes). Each provider implements:

```ts
interface WorldDataProvider {
  load(): Promise<EntityIndex>;
  getName(): string;
}
```

Providers live in `src/entities/providers/`: `MarkdownProvider` (sample world + file uploads), `SRDProvider`, `KankaProvider`, `HomebreweryProvider`, `NotionProvider`, `GoogleDocsProvider`, `FileUploadProvider`. On web, external API calls go through the CORS proxy at `proxy.dndref.com` (`src/proxy.ts` exports the base URL; `null` on native since native can call APIs directly).

The combined `EntityIndex` is fed into `EntityDetector` (Fuse.js, `src/entities/detector.ts`). Detection searches single words, 2-word, and 3-word phrases from the transcript against entity names and aliases. Threshold is 0.28; minimum 4 chars.

Every 2 seconds while active, the detector runs against only the *new* transcript text since last check (`processedUpToRef`). Matches are added to the card stack (max 6 cards). Pinned cards are sorted to the front. When the stack is full, the rightmost unpinned card is evicted.

### STT abstraction

`src/stt/index.ts` defines `STTProvider` (start/pause/resume/stop). Two implementations:
- `WebSpeechProvider` -- browser Web Speech API, zero config, web only
- `DeepgramProvider` -- Deepgram WebSocket streaming, works on web and native

On native, Deepgram is always used (requires key). On web, falls back to Web Speech if no Deepgram key is configured.

### Theming

`src/theme.ts` exports `DARK` and `LIGHT` color objects and `F` (font families). Use `useColors()` from `src/context/ui-settings.tsx` everywhere in components -- never hardcode colors. The `typeAccent()` helper maps entity type to its accent color.

### Ionicons on web

Cloudflare Pages can't serve paths containing `@` as static assets, so the bundled Ionicons TTF never loads in production. It is loaded from CDN in `app/_layout.tsx`.

## Testing

- Playwright (`e2e/`) -- screenshot tests and a behavioral app spec with a voice mock
- No unit test framework -- logic lives in the context providers and is exercised via e2e tests
- The debug tab (`app/debug.tsx`) is only visible in dev builds (`__DEV__`)
