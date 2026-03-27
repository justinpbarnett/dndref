# DnD Ref

default: dev

# ── Dev ──────────────────────────────────────────────────────────────────────

# Start web dev server
dev:
    npx expo start --web

# Start Expo with QR code (use with Expo Go on iPad)
start:
    npx expo start

# Start iOS simulator
ios:
    npx expo start --ios

# ── Quality ───────────────────────────────────────────────────────────────────

# Typecheck
check:
    npx tsc --noEmit

# ── Web build + deploy ────────────────────────────────────────────────────────

# Export static web build to dist/
build-web:
    npx expo export --platform web

# Deploy web to Cloudflare Pages (run build-web first)
deploy-web:
    npx wrangler pages deploy dist --project-name dnd-ref

# Build and deploy web in one step
ship-web: build-web deploy-web

# ── CORS proxy ────────────────────────────────────────────────────────────────

# Run CORS proxy locally at http://localhost:8787
proxy-dev:
    npx wrangler dev --config workers/cors-proxy/wrangler.toml

# Deploy CORS proxy to Cloudflare Workers
proxy-deploy:
    npx wrangler deploy --config workers/cors-proxy/wrangler.toml

# ── iOS build (EAS) ───────────────────────────────────────────────────────────
# Requires: eas.json configured + Apple Developer account
# Setup:    npx eas build:configure

# Build for TestFlight / App Store
build-ios:
    npx eas build --platform ios --profile production

# Build for device testing (development client)
build-ios-dev:
    npx eas build --platform ios --profile development

# Submit latest build to App Store
submit-ios:
    npx eas submit --platform ios

# ── Scrapers ──────────────────────────────────────────────────────────────────

# Run VTT world discovery scraper
scrape-discover:
    node scripts/scrape-vvd.mjs

# Export scraped VTT data
scrape-export:
    node scripts/scrape-vvd.mjs --export
