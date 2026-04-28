export function analyzeLog(apiLog) {
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
