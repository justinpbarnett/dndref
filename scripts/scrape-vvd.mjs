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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dir, 'vvd-api-log.json');
const OUT_FILE = path.join(__dir, 'world.md');

const EXPORT_MODE = process.argv.includes('--export');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function toMarkdown(entity) {
  const aliases = entity.aliases?.length ? `**Aliases:** ${entity.aliases.join(', ')}\n` : '';
  return `# ${entity.name}\n**Type:** ${entity.type}\n${aliases}\n${entity.summary}\n\n---\n\n`;
}

// ---------------------------------------------------------------------------
// Phase 1: Discovery
// ---------------------------------------------------------------------------

async function runDiscovery() {
  console.log('\n=== VVD.WORLD SCRAPER -- DISCOVERY MODE ===\n');
  console.log('1. A browser window will open.');
  console.log('2. Log in to vvd.world.');
  console.log('3. Navigate to your world. Click through several entity pages');
  console.log('   (characters, locations, items, etc.).');
  console.log('4. Come back here and press Ctrl+C when done.\n');
  console.log('API calls will be logged to:', LOG_FILE, '\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const apiLog = [];

  // Capture all fetch/XHR responses
  page.on('response', async (response) => {
    const url = response.url();
    const method = response.request().method();
    const status = response.status();
    const contentType = response.headers()['content-type'] ?? '';

    // Only capture JSON API responses
    if (!contentType.includes('application/json')) return;
    if (url.includes('/_next/') || url.includes('/static/')) return;

    try {
      const body = await response.json();
      const entry = { url, method, status, body };
      apiLog.push(entry);
      console.log(`[API] ${method} ${status} ${url}`);
    } catch {
      // body wasn't parseable JSON, skip
    }
  });

  await page.goto('https://vvd.world');

  // Keep running until Ctrl+C
  process.on('SIGINT', async () => {
    console.log(`\nCaptured ${apiLog.length} API calls. Saving to ${LOG_FILE}...`);
    fs.writeFileSync(LOG_FILE, JSON.stringify(apiLog, null, 2));
    console.log('Done. Run with --export to extract world data.\n');

    // Print a summary of unique API endpoints
    const endpoints = [...new Set(apiLog.map((e) => {
      const u = new URL(e.url);
      return `${e.method} ${u.pathname}`;
    }))];
    console.log('Unique endpoints captured:');
    endpoints.forEach((e) => console.log(' ', e));

    await browser.close();
    process.exit(0);
  });

  // Keep the process alive
  await new Promise(() => {});
}

// ---------------------------------------------------------------------------
// Phase 2: Export
// ---------------------------------------------------------------------------

async function runExport() {
  console.log('\n=== VVD.WORLD SCRAPER -- EXPORT MODE ===\n');

  if (!fs.existsSync(LOG_FILE)) {
    console.error('No API log found. Run without --export first to capture API calls.');
    process.exit(1);
  }

  const apiLog = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  console.log(`Loaded ${apiLog.length} captured API calls.\n`);

  // Analyze the log to find entity-like patterns
  analyzeLog(apiLog);

  // Try to extract entities from captured API responses
  const entities = extractEntitiesFromLog(apiLog);

  if (entities.length === 0) {
    console.log('\nCould not auto-extract entities from the captured responses.');
    console.log('This means the site uses a non-standard data shape.');
    console.log('Share the vvd-api-log.json file so we can map the fields.\n');
    process.exit(1);
  }

  console.log(`\nExtracted ${entities.length} entities. Writing to ${OUT_FILE}...`);

  const markdown = entities.map(toMarkdown).join('');
  fs.writeFileSync(OUT_FILE, markdown);

  console.log('Done!\n');
  console.log('Copy world.md into your DnD Ref project at:');
  console.log('  src/sample-world/my-world.md\n');
  console.log('Then update src/context/session.tsx to import and use it.');
}

// ---------------------------------------------------------------------------
// Log analysis: print what we found
// ---------------------------------------------------------------------------

function analyzeLog(apiLog) {
  console.log('--- API call summary ---');

  const byEndpoint = {};
  for (const entry of apiLog) {
    try {
      const u = new URL(entry.url);
      const key = `${entry.method} ${u.pathname}`;
      if (!byEndpoint[key]) byEndpoint[key] = { count: 0, sample: null };
      byEndpoint[key].count++;
      if (!byEndpoint[key].sample) byEndpoint[key].sample = entry.body;
    } catch {}
  }

  for (const [endpoint, info] of Object.entries(byEndpoint)) {
    console.log(`\n${endpoint}  (${info.count} calls)`);
    if (info.sample) {
      const keys = typeof info.sample === 'object' ? Object.keys(info.sample) : [];
      console.log('  Response keys:', keys.slice(0, 10).join(', '));
    }
  }
  console.log('\n--- end summary ---\n');
}

// ---------------------------------------------------------------------------
// Entity extraction: tries common patterns from world-building API shapes
// ---------------------------------------------------------------------------

function extractEntitiesFromLog(apiLog) {
  const entities = [];
  const seen = new Set();

  for (const entry of apiLog) {
    const candidates = findEntityCandidates(entry.body);
    for (const c of candidates) {
      const id = c.id ?? c.slug ?? slugify(c.name ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      entities.push(normalizeEntity(c));
    }
  }

  return entities;
}

function findEntityCandidates(data) {
  if (!data || typeof data !== 'object') return [];

  // Direct entity object: has name + some content field
  if (data.name && (data.content || data.description || data.summary || data.body)) {
    return [data];
  }

  // Array of entities
  if (Array.isArray(data)) {
    return data.flatMap(findEntityCandidates);
  }

  // Nested: { data: [...] }, { items: [...] }, { results: [...] }, { articles: [...] }
  const listKeys = ['data', 'items', 'results', 'articles', 'entries', 'nodes', 'edges'];
  for (const key of listKeys) {
    if (Array.isArray(data[key])) {
      return data[key].flatMap(findEntityCandidates);
    }
    // GraphQL edges pattern: { edges: [{ node: {...} }] }
    if (Array.isArray(data[key]?.edges)) {
      return data[key].edges.map((e) => e.node).flatMap(findEntityCandidates);
    }
  }

  // Single nested object
  for (const val of Object.values(data)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const candidates = findEntityCandidates(val);
      if (candidates.length) return candidates;
    }
  }

  return [];
}

// Map whatever the API returns to our Entity shape
function normalizeEntity(raw) {
  const name = raw.name ?? raw.title ?? 'Unknown';
  const type = normalizeType(raw.type ?? raw.category ?? raw.kind ?? '');
  const summary = raw.summary ?? raw.description ?? raw.content ?? raw.body ?? raw.excerpt ?? '';
  const aliases = raw.aliases ?? raw.alternativeNames ?? raw.also_known_as ?? [];

  return { name, type, summary: stripHtml(summary), aliases };
}

function normalizeType(raw) {
  const s = String(raw).toLowerCase();
  if (s.includes('npc') || s.includes('character') || s.includes('person')) return 'NPC';
  if (s.includes('location') || s.includes('place') || s.includes('region') || s.includes('city')) return 'Location';
  if (s.includes('faction') || s.includes('organization') || s.includes('group') || s.includes('guild')) return 'Faction';
  if (s.includes('item') || s.includes('artifact') || s.includes('object') || s.includes('weapon')) return 'Item';
  return 'Unknown';
}

function stripHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (EXPORT_MODE) {
  await runExport();
} else {
  await runDiscovery();
}
