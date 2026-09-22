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

# Lint
lint:
    npm run lint

# Run Playwright screenshot tests against local dist/ build
screenshot:
    npx playwright test e2e/screenshots.spec.ts --config playwright.config.ts

# Run Playwright screenshot tests with dark mode emulation
screenshot-dark:
    npx playwright test e2e/screenshots-dark.spec.ts --config playwright.config.ts

# ── Web build + deploy ────────────────────────────────────────────────────────
# How the detector matches is a build-time flag, EXPO_PUBLIC_EXACT_MATCHING.
# Every export clears Metro's cache, which costs a slower build and buys the
# only thing that makes the flag safe: that cache does not key on
# EXPO_PUBLIC_* vars, so without --clear an export silently reuses whichever
# mode was built last -- and ship-web would put the prototype on dndref.com.

# Export static web build to dist/ (prefix EXPO_PUBLIC_EXACT_MATCHING=1 for exact matching)
build-web:
    npx expo export --platform web --clear

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
