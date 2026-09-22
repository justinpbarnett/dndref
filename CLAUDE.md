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
just build-web      # export static web build to dist/ (always clears Metro cache)
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
2. `DataSourcesProvider` (`src/context/data-sources/provider.tsx`) -- stores API credentials and source URLs. It reads and writes them through `src/storage/settings.ts`; only `src/storage/app-data.ts` touches `AsyncStorage`. Exposes `uploadsVersion` counter that increments when a file is uploaded, triggering entity reload.
3. `SessionProvider` (`src/context/session.tsx`) -- owns the session lifecycle (idle/active/paused), the running STT provider, the entity detector, and the card stack.

### Entity detection pipeline

`SessionProvider` loads all configured `WorldDataProvider`s in parallel at startup (and again whenever `DataSourcesSettings` or `uploadsVersion` changes). Each provider implements:

```ts
type WorldDataProvider = { readonly name: string; load(): Promise<EntityIndex> };
```

Every provider returns its entities through the one normalizer in
`src/entities/ingestion/normalization.ts` -- directly for API sources (Kanka,
SRD, the AI parser), or via `ingestMarkdownContent` for text sources. That is
what trims names, resolves the entity type, splits aliases, and drops records a
source could not name. A provider that builds `Entity` literals by hand skips
all of it; the classic symptom is aliases silently never matching.

Providers live in `src/entities/providers/`: `MarkdownProvider` (sample world + file uploads), `SRDProvider`, `KankaProvider`, `HomebreweryProvider`, `NotionProvider`, `GoogleDocsProvider`, `FileUploadProvider`, `ScryfallProvider`. On web, external API calls go through the CORS proxy at `proxy.dndref.com`. `src/proxy-routes.ts` holds the one route table; both `src/proxy.ts` (`outboundUrl`, `fetchOutbound`) and the Worker in `workers/cors-proxy/` import it, so adding a route is one edit -- followed by `just proxy-deploy`, since web traffic only reaches a new route once the Worker ships it. Native calls the upstream directly, so every source takes the same way out on both platforms.

The combined `EntityIndex` is fed into `EntityDetector` (Fuse.js, `src/entities/detector.ts`). Detection searches every one- to three-word phrase from the transcript against entity names and aliases. Every number this depends on -- match threshold, the two different minimum lengths, phrase width, carry-over window, interval -- lives in `src/entities/detection-tuning.ts`. Tune detection there, not in the detector.

### Rulesets

`src/rulesets/` holds what changes when the table switches game: which providers load, which matcher runs, which source groups Settings asks for, and how an entity that arrived as a bare name gets filled in. A `Ruleset` answers all four, so adding a game is one entry in `RULESETS` rather than an edit in each of those places. `src/rulesets/id.ts` is a separate leaf that imports nothing, so `storage/settings.ts` can validate a stored id without pulling every world provider into the settings module.

Two ship today. **D&D** loads the sample world, uploads and whatever remote sources Settings has configured, and matches fuzzily. **MTG** loads Scryfall's 35k card names alone and matches exactly -- see `src/entities/detection-mode.ts` for why, and `exact-detection.ts` for what it does. A campaign's notes and a card index share no names worth matching, so MTG does not load the D&D sources; they are unused, not lost, and switching back loads them again.

`RulesetPicker` at the top of Settings > Sources is what switches, and saving the switch clears the stack. It edits the same draft the credential fields do, so the game is not switched until Save -- which is what the hint under it says while the pick is unsaved. The groups below it are `Ruleset.sources`, rendered from the draft, so a game only ever asks for what it reads: a field collected for a game that never loads it is a field that does nothing. Adding a source group means adding its id to `SOURCE_GROUP_IDS`, a component to `SOURCE_GROUPS` in `DataSection.tsx`, and the id to whichever rulesets read it.

Scryfall is the one source that indexes names only, so `Ruleset.hydrate` fetches card text for the handful of cards that actually reach the stack. `RuntimeEntityHydration` (`src/context/session-runtime/entity-hydration.ts`) runs it off `onCardsAdded`, asks about a name once, and never blocks detection.

While active, `RuntimeDetectionLoop` (`src/context/session-runtime/detection-loop.ts`) runs the detector on an interval against only the _new_ transcript text since the last pass (`processedTranscriptLength`), plus a short tail of the previous pass so a name spoken across the boundary is still matched. Matches are added to the card stack (max 6 cards). Pinned cards are sorted to the front. When the stack is full, the rightmost unpinned card is evicted.

### STT abstraction

`src/stt/index.ts` defines `STTProvider` (start/pause/resume/stop). Three implementations:

- `WebSpeechProvider` -- browser Web Speech API, zero config, web only
- `DeepgramBrowserCaptureAdapter` -- Deepgram WebSocket streaming from a browser mic
- `DeepgramNativeCaptureAdapter` -- the same streaming from a native recording

Both Deepgram adapters extend `DeepgramCaptureAdapterBase`, which holds the name, the API key check, and the capture lifecycle; each subclass only supplies its platform's audio. `buildProvider` (`src/stt/build-provider.ts`) is the one place the platform is branched on. On native, Deepgram is always used (requires key). On web, falls back to Web Speech if no Deepgram key is configured.

### Theming

`src/theme.ts` exports `DARK` and `LIGHT` color objects and `F` (font families). Use `useColors()` from `src/context/ui-settings.tsx` everywhere in components -- never hardcode colors. The `typeAccent()` helper maps entity type to its accent color.

### Ionicons on web

Cloudflare Pages can't serve paths containing `@` as static assets, so the bundled Ionicons TTF never loads in production. It is loaded from CDN in `app/_layout.tsx`.

## Testing

- Vitest (`src/**/*.test.ts`) -- unit tests, `environment: 'node'`, so a `.tsx` file cannot be unit tested. Logic that needs covering belongs in a `.ts` module the component calls.
- Playwright (`e2e/`) -- screenshot tests and behavioral app specs with a voice mock. Specs drive the app through the `TableSession` object from `e2e/helpers.ts` (`openTable` / `openTableSession`) rather than clicking controls and timing detection passes themselves.
- The debug tab (`app/debug.tsx`) is only visible in dev builds (`__DEV__`)
