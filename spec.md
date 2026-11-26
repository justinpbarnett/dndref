# DnD Live Reference

A toy iPad app (and web app) for a DM running long-form campaigns with heavy worldbuilding. Listens at the table, detects entity mentions in real time, and surfaces relevant lore so the game keeps moving.

## Problem

The DM has built out a rich world in their notes (Notion, Google Docs, Kanka, etc.) with characters, locations, factions, items, and lore. Mid-session, when a player asks "wait, what's the deal with the Ironspire?" the DM either guesses, pauses to look it up, or glosses over it. All three slow the game or erode world consistency.

The fix: a passive listener that detects when known entities are mentioned and instantly shows the DM what's in the notes, no lookup required.

## What it does

1. Loads world data from multiple sources at session start (SRD, Kanka, Notion, Google Docs, Homebrewery, or uploaded files)
2. Listens to the table via device mic (Web Speech API on web, Deepgram on native)
3. Transcribes speech in near-real time via cloud STT provider
4. Detects entity mentions (characters, locations, factions, items, lore entries) by comparing spoken phrases to whole names and aliases
5. Shows entity cards in a pinnable, auto-updating stack (max 6 cards)
6. No AI in the live path, all detection is deterministic

## What it doesn't do

- No inference or suggestions during the session -- just facts
- No live world data API updates (static data loaded at startup)
- No player-facing output
- No campaign state tracking
- No end-of-session summary/analysis (not implemented)
- No rules lookup beyond 5e SRD monsters/items
- No character sheets or stats tracking

## Platform

**React Native + Expo** with web support via Expo Router. Deployed to dndref.com via Cloudflare Pages, and iOS via TestFlight.

## Source data

World data flows through a `WorldDataProvider` abstraction. The app supports multiple providers simultaneously:

```
WorldDataProvider (interface)
  load(): Promise<EntityIndex>
  getName(): string

Implemented providers:
  - SRDProvider         (Open5e API for 5e monsters/items)
  - KankaProvider       (Kanka.io campaign data)
  - HomebreweryProvider (Homebrewery.naturalcrit.com documents)
  - NotionProvider      (Notion workspace pages)
  - GoogleDocsProvider  (Google Docs exports)
  - FileUploadProvider  (User-uploaded .md, .txt, .json files)
  - MarkdownProvider    (Sample world data + used internally)
```

`EntityIndex` is the shared output regardless of provider: a list of entities each with canonical name, aliases, type, and a summary body. Everything downstream (fuzzy matching, card display) works against that shape only.

## Architecture

```
mic input (STTProvider abstraction)
  -> WebSpeechProvider (Chrome/Edge) or DeepgramProvider (web + native)
  -> rolling transcript buffer
  -> entity detector (whole-phrase match, runs every 2 seconds)
     - Exact title, a bounded misspelling, or a distinctive leading word
     - Spoken forms of punctuated titles, and the longest match owns its span
  -> card stack UI (newest first, pinnable, max 6 cards)
     - Rightmost unpinned card evicted when full
     - Pinned cards sorted to front
```

### Context provider hierarchy

```
UISettingsProvider (theme, card size)
  -> DataSourcesProvider (API credentials, data sources settings)
    -> SessionProvider (STT lifecycle, entity detection, card stack)
```

On web, `UISettingsProvider` reads from `localStorage` synchronously to avoid hydration flicker. On native, it reads from `AsyncStorage` on mount.

### STT provider abstraction

```
STTProvider (interface)
  start(): Promise<void>
  pause(): void
  resume(): void
  stop(): void
  name: string

WebSpeechProvider   - Browser Web Speech API (Chrome/Edge only)
DeepgramProvider    - Deepgram streaming API (WebSocket on web, REST on native)
```

Deepgram is the primary provider on native iPad. On web, falls back to Web Speech if no Deepgram key is configured.

### Entity detection

Not NLP. Each spoken phrase is compared with the loaded names and aliases:

- The whole title, or a misspelling of a word in it. How far a misspelling may drift, and every other number, lives in `src/entities/detection-tuning.ts`.
- The leading word of a two-word name when that word is long and not ordinary speech ("Gimble" for Gimble Lock, not "purple" for Purple Worm).
- A spoken form of a punctuated title. A trailing `, +1, +2, or +3` is dropped, a parenthetical is indexed both without the parentheses and as the text inside them, a slash is indexed as both sides, and apostrophes are dropped the way exact matching drops them (`will o wisp`, `will-o-wisp`, and `will-o'-wisp` all meet).
- An unqualified color ("red dragon") is the adult. Young, ancient, and wyrmling match when that age is spoken.

The longest match owns its span, so "dire wolf" does not also raise Wolf and "wand of the war mage" does not also raise Mage. A one-word alias that is ordinary speech does not fire when it is a nickname cut from the title ("the order" for The Dawnwarden Order, "compact"). The same words fire, in either case, when the notes write them as a determiner plus a word the title does not contain ("the order" or "the Order" for some other faction), and the article stays part of the phrase. A name from the table's own notes that is shorter than the usual misspelling length, and at least four letters, takes one edit when the spoken word is not English, so "Gorn" can be Gorm and "kale" cannot be Kael. A transcript key under four letters is never searched, so a three-letter name stays silent even when spoken in full. The SRD catalog is standard spelling and takes no such edit. A catalog name that is itself an ordinary word (Solar, Noble, Scout, Pony) still matches exactly. A name of six letters or more still uses the wider misspelling budget, and that budget still matches a real English word.

Runs every 2 seconds on only the _new_ transcript text since the last check (`processedUpToRef`), plus a short tail so a name split across the boundary is still seen.

The ruleset in play decides which matcher runs. A D&D table matches fuzzily. A
Magic table matches exactly (`src/entities/exact-detection.ts`), because card
names are ordinary English, where a near miss is a false positive rather than a
lucky catch. One build serves both, and the toggle above the card grid switches
between them.

### Card stack behavior

- New match always lands at position 1 (after pinned cards), shifting others right
- Pinning a card moves it to position 1
- Unpinning moves the card to just after the last pinned card
- Cards are auto-dismissed when pushed off the grid by new matches (max 6 cards)
- Force dismiss: X button on each card removes it immediately
- Dismissed entities can reappear if mentioned again

## Session controls

- **Start** -- begins mic capture + transcription
- **Pause** -- stops transcription, cards stay visible
- **Resume** -- continues from pause
- **Stop** -- ends session, clears cards and transcript

## UI layout

**Tab 1 -- Reference (default)**

Cards displayed in a responsive grid based on card size setting:

- S: 4 columns (landscape) / 3 columns (portrait)
- M: 3 columns / 2 columns (default)
- L: 2 columns / 2 columns
- XL: 2 columns / 1 column

Session controls at top: Start/Pause/Resume/Stop buttons with STT status indicator.

**Tab 2 -- Debug (dev builds only)**

Rolling transcript feed + controls for testing. Hidden in production builds.

**Tab 3 -- Settings**

Configure data sources, STT provider, card size, and theme.

## Stack

- React Native + Expo (SDK 52+)
- Expo Router for navigation
- In-tree phrase matcher (`src/entities/detector.ts`, tuned from `src/entities/detection-tuning.ts`)
- Deepgram SDK (streaming STT via WebSocket on web)
- AsyncStorage (persist settings)
- Cloudflare Workers (CORS proxy for web API access)

## File layout

```
dnd-ref/
  app/
    _layout.tsx         <- Root layout with provider hierarchy
    index.tsx           <- Main reference screen with card grid
    debug.tsx           <- Debug tab (dev only)
    settings.tsx        <- Settings screen
  src/
    components/         <- CardGrid, EntityCard, SessionControls
    context/            <- UISettingsProvider, DataSourcesProvider, SessionProvider
    entities/           <- Entity types, detector, providers
      providers/        <- SRD, Kanka, Homebrewery, Notion, Google Docs, File Upload
    stt/                <- STTProvider interface, WebSpeechProvider, DeepgramProvider
    sample-world/       <- Sample campaign data for testing
    theme.ts            <- Colors, fonts
    proxy.ts            <- CORS proxy configuration
  e2e/                  <- Playwright tests
  workers/              <- Cloudflare Workers
    cors-proxy/         <- CORS proxy for external APIs
```

## Build commands

```
just dev            # web dev server
just start          # Expo with QR code for iPad
just check          # TypeScript typecheck
just build-web      # export static web build
just ship-web       # build + deploy to Cloudflare Pages
just proxy-dev      # run CORS proxy locally
just screenshot     # Playwright screenshot tests
just build-ios      # EAS build for TestFlight
```

## Notes

- AI parser available in settings for converting campaign notes to entities (uses Claude API)
- No AI in the live detection path -- all entity matching is deterministic string matching (whole-phrase matching by default, exact matching for a catalog of ordinary English names)
- Debug tab only visible in dev builds (`__DEV__` flag)
