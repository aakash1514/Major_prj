// Runs the k6 API scenarios N times each against one backend version and records medians.
// Usage: node load/run-api.js --target current|before [--scenarios a,b] [--runs 3] [--vus 50] [--duration 60s]
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { seed_db } from '../seed.js';
import { PERF_ROOT, startServer, stopServer, baseUrl } from '../lib/servers.js';
import { median } from '../lib/stats.js';

const K6 = process.env.K6_BIN || 'C:\\Program Files\\k6\\k6.exe';
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };

const ALL = ['crops_list', 'crop_by_id', 'login', 'orders_buyer', 'orders_admin', 'admin_orders', 'admin_users', 'admin_crops', 'create_order'];
const target = arg('target', 'current');
const scenarios = arg('scenarios', ALL.join(',')).split(',');
const runs = Number(arg('runs', 3));
const vus = arg('vus', '50');
const duration = arg('duration', '60s');
const warmup = arg('warmup', '10s');
const tag = arg('tag', '');

const server = `backend-${target}`;
const outDir = path.join(PERF_ROOT, 'results', 'raw', 'api', target + tag);
fs.mkdirSync(outDir, { recursive: true });

// Writes go last so reads always see exactly the seeded volumes.
scenarios.sort((a, b) => (a === 'create_order') - (b === 'create_order'));

const summary = { target, server, base_url: baseUrl(server), runs, vus: Number(vus), duration, warmup, scenarios: {} };
console.log(`Seeding before ${target} run...`, JSON.stringify((await seed_db()).counts));
let handle = await startServer(server);
console.log(`${server} up in ${handle.startupMs}ms at ${baseUrl(server)}`);

try {
  for (const sc of scenarios) {
    const results = [];
    for (let r = 1; r <= runs; r++) {
      if (sc === 'create_order') {
        // Reset table size so every write run starts from 10,000 orders.
        stopServer(handle);
        await seed_db();
        handle = await startServer(server);
      }
      const out = path.join(outDir, `${sc}-run${r}.json`);
      process.stdout.write(`[${target}] ${sc} run ${r}/${runs} ... `);
      execFileSync(K6, ['run', '--quiet', '--no-color',
        '-e', `SCENARIO=${sc}`, '-e', `BASE_URL=${baseUrl(server)}`, '-e', `VUS=${vus}`,
        '-e', `DURATION=${duration}`, '-e', `WARMUP=${warmup}`, '-e', `OUT=${out}`,
        path.join(PERF_ROOT, 'load', 'api.js')], { stdio: ['ignore', 'ignore', 'inherit'] });
      const res = JSON.parse(fs.readFileSync(out, 'utf8'));
      results.push(res);
      console.log(`p95=${res.latency_ms.p95.toFixed(1)}ms rps=${res.rps.toFixed(1)} 4xx=${res.status.client_4xx} 5xx=${res.status.server_5xx} net=${res.status.network_or_timeout}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
    summary.scenarios[sc] = {
      median: {
        p50_ms: median(results.map((x) => x.latency_ms.p50)),
        p95_ms: median(results.map((x) => x.latency_ms.p95)),
        p99_ms: median(results.map((x) => x.latency_ms.p99)),
        rps: median(results.map((x) => x.rps)),
        error_rate_5xx_timeout: median(results.map((x) => x.error_rate_5xx_timeout)),
        rejection_rate_4xx: median(results.map((x) => x.rejection_rate_4xx)),
        response_kb_avg: median(results.map((x) => x.response_kb.avg)),
      },
      runs: results,
    };
  }
} finally {
  stopServer(handle);
}

if (scenarios.includes('create_order')) await seed_db(); // leave DB at seeded volumes
const file = path.join(PERF_ROOT, 'results', 'raw', `api-${target}${tag}.json`);
fs.writeFileSync(file, JSON.stringify(summary, null, 2));
console.log('Wrote', file);
