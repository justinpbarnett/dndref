/**
 * vvd.world scraper
 *
 * Run: node scripts/scrape-vvd.mjs
 *
 * Phase 1 (discovery): opens a headed browser, you log in and browse your world.
 *   The script watches all network requests and saves a log of every API call.
 *   Press Ctrl+C when you've navigated a few entity pages -- we'll use the log
 *   to understand the API structure.
 *
 * Phase 2 (export): reads the log, replays the API calls for every entity,
 *   and writes world.md in the format DnD Ref expects.
 *
 * Usage:
 *   node scripts/scrape-vvd.mjs           # Phase 1: discover
 *   node scripts/scrape-vvd.mjs --export  # Phase 2: export (run after discovery)
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

import { runDiscovery } from './vvd-discovery.mjs';
import { runExport } from './vvd-export-runner.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dir, 'vvd-api-log.json');
const OUT_FILE = path.join(__dir, 'world.md');

const EXPORT_MODE = process.argv.includes('--export');

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (EXPORT_MODE) {
  await runExport({ logFile: LOG_FILE, outFile: OUT_FILE });
} else {
  await runDiscovery({ chromium, logFile: LOG_FILE });
}
