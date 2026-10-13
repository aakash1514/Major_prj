// Extracts the six verified before/after metrics from a local baseline JSON into a small public summary.
// Usage: node build-summary.js [--date 2026-10-13]
import fs from 'fs';
import path from 'path';
import { PERF_ROOT } from './lib/servers.js';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const date = arg('date', '2026-10-13');
const b = JSON.parse(fs.readFileSync(path.join(PERF_ROOT, 'results', `baseline-${date}.json`), 'utf8'));

const api = (v) => b.api[v].scenarios.admin_orders.median;
const size = (v) => b.api.payload_sizes[v]['GET /api/admin/orders'].raw_kb;
const ml = (v, k) => b.ml.load[`ml-${v}-waitress`].results[k].median.p50_ms;
const metric = (name, unit, before, after, extra = {}) => ({ name, unit, before, after, ...extra });

const summary = {
  date,
  test_setup: {
    api: 'k6, 10 s warm-up then 50 concurrent users for 60 s, median of 3 runs',
    ml: 'ML service under waitress (8 threads), 10 warm-up then 200 sequential requests, median of 3 runs',
    database: 'PostgreSQL 15.4 seeded with 10,000 orders, 2,000 crops, 261 users',
    environment: 'Single machine, all services on localhost',
  },
  commits: { before: b.git.before_ref, after: b.git.commit, after_includes: '0f151ee' },
  metrics: [
    metric('/api/admin/orders p95 latency', 'ms', api('before').p95_ms, api('current').p95_ms),
    metric('/api/admin/orders throughput', 'req/s', api('before').rps, api('current').rps),
    metric('/api/admin/orders error rate (5xx + timeouts)', 'fraction', api('before').error_rate_5xx_timeout, api('current').error_rate_5xx_timeout),
    metric('/api/admin/orders response size', 'KiB (1024 bytes)', size('before'), size('current')),
    metric('POST /predict/price median latency', 'ms', ml('before', 'price:seq'), ml('current', 'price:seq')),
    metric('POST /predict/demand median latency', 'ms', ml('before', 'demand:seq'), ml('current', 'demand:seq')),
  ],
};

const out = path.join(PERF_ROOT, 'results', `summary-${date}.json`);
fs.writeFileSync(out, JSON.stringify(summary, null, 2) + '\n');
console.log('Wrote', out);
