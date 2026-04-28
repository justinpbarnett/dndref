import fs from 'fs';

import { analyzeLog, extractEntitiesFromLog, toMarkdown } from './vvd-export-helpers.mjs';

export async function runExport({ logFile, outFile }) {
  console.log('\n=== VVD.WORLD SCRAPER -- EXPORT MODE ===\n');

  if (!fs.existsSync(logFile)) {
    console.error('No API log found. Run without --export first to capture API calls.');
    process.exit(1);
  }

  const apiLog = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  console.log(`Loaded ${apiLog.length} captured API calls.\n`);

  analyzeLog(apiLog);
  const entities = extractEntitiesFromLog(apiLog);

  if (entities.length === 0) {
    console.log('\nCould not auto-extract entities from the captured responses.');
    console.log('This means the site uses a non-standard data shape.');
    console.log('Share the vvd-api-log.json file so we can map the fields.\n');
    process.exit(1);
  }

  console.log(`\nExtracted ${entities.length} entities. Writing to ${outFile}...`);

  const markdown = entities.map(toMarkdown).join('');
  fs.writeFileSync(outFile, markdown);

  console.log('Done!\n');
  console.log('Copy world.md into your DnD Ref project at:');
  console.log('  src/sample-world/my-world.md\n');
  console.log('Then update src/context/session.tsx to import and use it.');
}
