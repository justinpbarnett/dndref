# DnD Live Reference

A toy iPad app for a DM running long-form campaigns with heavy worldbuilding. Listens to the table, detects entity mentions in real time, and surfaces relevant lore so the game keeps moving.

## Problem

The DM has built out a rich world in vvd.world -- characters, locations, factions, items, lore. Mid-session, when a player asks "wait, what's the deal with the Ironspire?" the DM either guesses, pauses to look it up, or glosses over it. All three slow the game or erode world consistency.

The fix: a passive iPad listener that detects when known entities are mentioned and instantly shows the DM what's in the notes -- no lookup required.

## What it does

1. Loads the DM's vvd.world export at session start
2. Listens to the table via iPad mic
3. Transcribes speech in near-real time via a cloud STT provider
4. Detects entity mentions (characters, locations, factions, items, lore entries)
5. Shows entity cards in a pinnable, auto-updating stack
6. At session end, shows an in-app summary with suggested vvd.world updates

## What it doesn't do

- No inference or suggestions during the session -- just facts
- No live vvd.world API (static export loaded at startup)
- No player-facing output
- No campaign state tracking (that's vvd.world's job)
- No rules lookup (5e SRD, conditions, spells) -- possible v2
- No character sheets or stats -- possible v2

## Platform

**React Native + Expo** -- iPad app, all on-device. No server required. Installable via TestFlight or direct Expo build.

## Source data

World data flows through a `WorldDataProvider` abstraction. The POC uses a vvd.world file export, but the interface is designed to accommodate live APIs or other tools later.

```
WorldDataProvider (interface)
  load(): Promise<EntityIndex>
  getName(): string

VvdWorldFileProvider implements WorldDataProvider   <- POC default
  import via iOS Files picker, parses export format
  index persists across sessions, re-import to refresh

WorldAnvilProvider implements WorldDataProvider     <- future
ApiProvider implements WorldDataProvider            <- future (generic REST)
```

`EntityIndex` is the shared output regardless of provider: a list of entities each with canonical name, aliases, type, and a summary body. Everything downstream (fuzzy matching, card display) works against that shape only -- no provider-specific logic leaks through.

## Architecture

```
mic input (Expo AV)
  -> STTProvider (streaming)
  -> rolling transcript buffer (last ~30s)
  -> entity detector (fuse.js fuzzy match, runs every 2-3s)
  -> card stack UI (newest first, pinnable)

session end
  -> full transcript saved
  -> Claude API pass: flag session events worth updating in vvd.world,
     flag unmatched entities (things mentioned with no notes)
  -> in-app summary screen with export option
```

### STT provider abstraction

Cloud STT is required on iPad (no viable local option). Built as a swappable interface so the DM can use whichever provider he has a key for.

```
STTProvider (interface)
  connect(apiKey): void
  start(): void
  pause(): void
  stop(): void
  onTranscript: (text: string, isFinal: boolean) => void

DeepgramProvider implements STTProvider   <- default
AssemblyAIProvider implements STTProvider
OpenAIWhisperProvider implements STTProvider
```

Deepgram is the default -- ~300ms latency, good accuracy, ~$0.004/min (~$0.72 for a 3hr session). The DM sets up his own API key in settings.

### Entity detection

Not NLP -- fuzzy string matching against the known entity list from the export. Uses fuse.js. Fast, deterministic, no hallucinations.

- Runs every 2-3s on the last 30s of transcript
- Confidence threshold to avoid false positives on common words
- Recency debounce: don't re-surface an entity that matched in the last 2 minutes (unless pinned)

### Card stack

Multiple cards visible at once, sorted newest to oldest. Each card:

```
IRONSPIRE FORTRESS          [pin] [x]
Location - Northern Wastes
----------------------------------
An ancient dwarven keep seized
by the Lich King in the Third Age.
Now his eastern command post.
```

- New match always lands at position 1, shifting all others right then down
- Pinning a card moves it to position 1 (animated), shifting others down
- Unpinning moves the card to just behind the last pinned card -- if it's already there or further back, it stays put
- Cards are auto-dismissed when pushed off the grid by new matches
- Force dismiss: X button on each card removes it immediately
- Max ~6 cards visible (2x3 landscape grid) before displacement kicks in

### Session controls

- **Start** -- begins mic capture + transcription, starts session log
- **Pause** -- stops transcription, cards stay visible, session timer pauses
- **Stop** -- ends session, triggers summary screen

## End-of-session summary

After tapping Stop:

1. Claude API reviews the session transcript against the entity index
2. Surfaces: entities whose notes may be out of date based on session events, unmatched entity names (things mentioned that have no notes), and notable moments worth logging
3. Summary shows in-app with an Export option (shares transcript + suggestions as text/markdown via iOS share sheet)

Claude API key entered once in app settings (same settings screen as STT key).

## UI layout (iPad)

Two tabs. The DM lives in the first one all session.

**Tab 1 -- Reference (default)**

Cards displayed in a grid (2 columns on portrait, 3 on landscape). Newest card always lands at top-left, shifting all others right then down. Oldest unpinned card is displaced when the grid is full. Shift is animated so the movement reads as a flow rather than a jump.

```
Landscape (3 columns):
+----------------------------------------------------+
|  DnD Ref    [Pause]  [Stop]          Recording...  |
+----------------+----------------+------------------+
| IRONSPIRE [p][x]| MALACHAR [p][x]| OBSIDIAN  [p][x] |
|  Location      |  NPC - Wizard  |  Faction         |
|  Ancient keep  |  Former mage,  |  Shadow guild,   |
|  seized by...  |  betrayed...   |  12 known...     |
+----------------+----------------+------------------+
|  (next card    |                |                  |
|   lands here)  |                |                  |
+----------------+----------------+------------------+
```

No transcript visible. Grid fills top-left to bottom-right. Pinned cards don't move or get displaced.

**Tab 2 -- Debug (verification only)**

Rolling transcript feed + a mic level indicator. Just to confirm the app is picking up audio. Not meant for use during sessions.

## Stack

- React Native + Expo (SDK 52+)
- Expo AV (mic capture)
- fuse.js (fuzzy entity matching)
- Deepgram JS SDK (default STT, streaming via WebSocket)
- Claude API (end-of-session analysis only -- not in live path)
- Expo FileSystem + Share (import export file, export session output)
- AsyncStorage (persist settings, entity index)

## File layout

```
dnd-ref/
  spec.md
  app/
    index.tsx          <- session screen (main UI)
    settings.tsx       <- API keys, STT provider
    summary.tsx        <- end-of-session summary
  src/
    stt/
      index.ts         <- STTProvider interface
      deepgram.ts
      assemblyai.ts
      openai-whisper.ts
    entities/
      index.ts         <- EntityIndex type + WorldDataProvider interface
      providers/
        vvd-world.ts   <- parse vvd.world export (POC default)
        world-anvil.ts <- future
      detector.ts      <- fuse.js matching against buffer
    session/
      log.ts           <- transcript accumulation
      analysis.ts      <- Claude API pass at session end
    components/
      EntityCard.tsx
      CardStack.tsx
      TranscriptPane.tsx
      SessionControls.tsx
  sample-export/       <- anonymized vvd.world export for dev/testing
```

## Open questions

1. What format does vvd.world export? (Waiting on sample from DM.) JSON/XML/CSV determines how `vvd-world.ts` works.
2. Does every entity type have consistent fields, or is lore freeform?
3. ~~Card dismiss behavior?~~ Answered: pushed off by new matches (no timer). Unpinning moves card to bottom of stack, first to be replaced.
4. ~~Does the DM want the transcript pane at all?~~ Answered: tab 2 debug view only, not shown during sessions.
5. ~~Internet at game night?~~ Answered: yes, internet assumed. No offline fallback needed.

## Build order

1. Get sample vvd.world export, understand schema
2. `vvd-world.ts` -- parse export into EntityIndex, verify entity coverage
3. `detector.ts` -- fuzzy match against test phrases, tune threshold
4. Deepgram streaming in Expo -- mic -> WebSocket -> transcript
5. `CardStack.tsx` + `EntityCard.tsx` -- static first, then wire to detector
6. Session controls (Start/Pause/Stop)
7. `analysis.ts` -- Claude pass + summary screen
8. Settings screen (API keys, provider selection)
9. Test at a real session before adding anything else
