# DnD Ref

Sits on your D&D table, listens, and pops up cards when entities are mentioned: NPCs, locations, factions, items. No lookup, no tab-switching.

iPad app and web app at [dndref.com](https://dndref.com).

## How it works

1. Load your world data in Settings (Kanka, Notion, Homebrewery, Google Docs, or file uploads)
2. Tap Start and set the iPad on the table
3. Cards appear as entities are mentioned
4. Pin to keep a card visible; dismiss when done

Detection runs every 2 seconds using fuzzy matching against your loaded entities. No AI in the live path, just fast deterministic string matching.

## Data sources

You can have multiple sources active at once. Mix and match as needed.

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
Paste any campaign text and Claude pulls out named entities into a structured upload. Uses Haiku (~$0.001 per parse). Requires an Anthropic API key from console.anthropic.com.

## STT options

**Web Speech** works in Chrome and Edge, no API key needed. Fine for quick testing.

**Deepgram** works on web and iPad. ~$0.004/min, about $0.72 for a 3-hour session. If you're actually running this at a table, Deepgram is more reliable. Get a key at console.deepgram.com.

## Commands

Uses [just](https://github.com/casey/just). Run `just` with no args to list everything.

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

Requires an Apple Developer account and EAS:

```bash
npm install -g eas-cli
eas login
eas build:configure  # generates eas.json
just build-ios-dev   # first build
```

## CORS proxy

Notion, Google Docs, and the Anthropic API block browser requests via CORS. On web, calls route through a Cloudflare Worker at `proxy.dndref.com`. On native (iOS), everything goes directly.

To deploy your own:

```bash
npx wrangler login
just proxy-dev       # test locally at localhost:8787
just proxy-deploy    # deploy to Cloudflare Workers
```

After deploying, add a CNAME in Cloudflare DNS: `proxy` -> `dnd-ref-proxy.<account>.workers.dev`. Then uncomment the `[[routes]]` block in `workers/cors-proxy/wrangler.toml` and redeploy.

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

React Native + Expo SDK 52, Expo Router, fuse.js for fuzzy matching, Deepgram or Web Speech for STT, AsyncStorage for settings and uploads. Hosted on Cloudflare Pages with a Cloudflare Worker handling CORS for the API calls that need it.
