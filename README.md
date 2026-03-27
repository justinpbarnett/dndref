# DnD Ref

A live reference tool for D&D sessions. Listens to the table, detects when entities from your world are mentioned, and surfaces the relevant notes automatically -- no lookup required.

Works as an iPad app and a web app at [dndref.com](https://dndref.com).

## How it works

1. Load your world data at session start (Kanka, Notion, Homebrewery, Google Docs, or file uploads)
2. Tap Start and set the iPad on the table
3. As entities are mentioned at the table, cards pop up with their summary
4. Pin cards to keep them visible; dismiss when done

Entity detection runs every 2 seconds using fuzzy matching against your loaded entities. No AI in the live path -- just fast, deterministic string matching.

## Data sources

Configure in the Settings tab. Multiple sources can be active at once.

| Source | What it loads | Notes |
|---|---|---|
| D&D 5e SRD | ~350 monsters + magic items | On by default, cached locally |
| Kanka | Characters, locations, factions, items | Requires API token + campaign ID |
| Homebrewery | Any public brew | Paste the share URL |
| Notion | Pages from your workspace | Requires integration token + page URLs |
| Google Docs | Any public doc | Paste the share URL |
| File upload | `.md`, `.txt`, `.json` files | Obsidian exports, campaign notes, etc. |
| AI parsing | Paste text, Claude extracts entities | Requires Anthropic API key |

### Kanka setup
1. Get your API token at kanka.io/en/profile/api
2. Find your campaign ID in the URL: `kanka.io/en/campaign/12345`

### Notion setup
1. Create an integration at notion.so/my-integrations
2. Share each target page with the integration
3. Paste page URLs (comma-separated) in Settings

### AI parsing
Paste any campaign text and Claude extracts all named entities into a structured JSON upload. Uses `claude-haiku` -- roughly $0.001 per parse. Requires an Anthropic API key from console.anthropic.com.

## STT setup

**Web Speech** -- works in Chrome and Edge, no API key needed. Good for testing.

**Deepgram** -- works on web and iPad. ~$0.004/min (~$0.72 for a 3-hour session). Get a free key at console.deepgram.com.

## Commands

Uses [just](https://github.com/casey/just) as a task runner. Run `just` with no args to see all commands.

```bash
just dev             # web dev server
just ios             # iOS simulator
just check           # typecheck

just build-web       # export static build to dist/
just deploy-web      # push dist/ to Cloudflare Pages
just ship-web        # build + deploy in one step

just proxy-dev       # run CORS proxy locally (localhost:8787)
just proxy-deploy    # deploy CORS proxy to Cloudflare Workers

just build-ios       # EAS build for App Store (requires eas.json)
just build-ios-dev   # EAS build for device testing
just submit-ios      # submit to App Store
```

## iOS build setup

Requires an Apple Developer account and EAS configured:

```bash
npm install -g eas-cli
eas login
eas build:configure  # generates eas.json
just build-ios-dev   # first build
```

## CORS proxy

Notion, Google Docs, and the Anthropic API are blocked by CORS in the browser. The web app routes those calls through a Cloudflare Worker at `proxy.dndref.com`.

To deploy your own:

```bash
npx wrangler login
just proxy-dev       # test locally at localhost:8787
just proxy-deploy    # deploy to Cloudflare Workers
```

After deploying, add a CNAME in Cloudflare DNS: `proxy` -> `dnd-ref-proxy.<account>.workers.dev`, then uncomment the `[[routes]]` block in `workers/cors-proxy/wrangler.toml` and redeploy.

On native (iOS), all API calls go directly -- no proxy needed.

## Project structure

```
app/
  index.tsx          -- session screen (card grid + controls)
  settings.tsx       -- data sources, STT, file uploads
  debug.tsx          -- transcript feed for troubleshooting
  _layout.tsx        -- tab layout + context providers

src/
  entities/
    index.ts         -- Entity type + WorldDataProvider interface
    detector.ts      -- fuse.js fuzzy matching
    ai-parser.ts     -- Claude entity extraction
    providers/
      srd.ts         -- D&D 5e SRD via Open5e API (cached)
      kanka.ts       -- Kanka campaign API
      homebrewery.ts -- Homebrewery public brews
      notion.ts      -- Notion workspace pages
      google-docs.ts -- Google Docs public export
      markdown.ts    -- Generic markdown parser
      file-upload.ts -- AsyncStorage-backed file uploads
  stt/
    index.ts         -- STTProvider interface
    deepgram.ts      -- Deepgram streaming WebSocket
    web-speech.ts    -- Web Speech API
  context/
    session.tsx      -- Session state, STT lifecycle, entity detection
    data-sources.tsx -- Data source settings + upload versioning
    ui-settings.tsx  -- Card size preference
  proxy.ts           -- CORS proxy URL (web only)
  theme.ts           -- Colors + fonts

workers/
  cors-proxy/
    index.ts         -- Cloudflare Worker: proxies Notion, Google Docs, Anthropic
    wrangler.toml    -- Deployment config
```

## Stack

- React Native + Expo SDK 52 (iOS + web)
- Expo Router (file-based navigation)
- fuse.js (fuzzy entity matching)
- Deepgram / Web Speech (STT)
- AsyncStorage (settings + file uploads)
- Cloudflare Pages (web hosting) + Workers (CORS proxy)
