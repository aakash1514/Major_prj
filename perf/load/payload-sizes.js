// Measures the size of one successful (200) response per endpoint, on the current and "before" backends.
// The load-test KB averages include small 5xx bodies when requests fail, so this is the authoritative payload size.
// The backend has no compression middleware, so raw bytes = bytes on the wire (plus headers).
// Usage: node load/payload-sizes.js
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { PERF_ROOT, startServer, stopServer, baseUrl } from '../lib/servers.js';

const ENDPOINTS = [
  ['GET /api/crops', '/api/crops', null],
  ['GET /api/orders (buyer)', '/api/orders', 'buyer'],
  ['GET /api/orders (admin)', '/api/orders', 'admin'],
  ['GET /api/admin/orders', '/api/admin/orders', 'admin'],
  ['GET /api/admin/users', '/api/admin/users', 'admin'],
  ['GET /api/admin/crops', '/api/admin/crops', 'admin'],
];

async function measure(server) {
  const h = await startServer(server);
  const base = baseUrl(server);
  const login = async (email) => (await (await fetch(`${base}/api/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'PerfTest@123' }) })).json()).token;
  const tokens = { buyer: await login('buyer1@perf.agriflow.local'), admin: await login('admin1@perf.agriflow.local') };
  const out = {};
  try {
    for (const [label, p, role] of ENDPOINTS) {
      const r = await fetch(base + p, { headers: role ? { Authorization: `Bearer ${tokens[role]}` } : {} });
      const buf = Buffer.from(await r.arrayBuffer());
      const body = JSON.parse(buf.toString('utf8'));
      const rows = Array.isArray(body) ? body.length : (body.orders || body.users || body.crops || []).length;
      out[label] = { status: r.status, rows, raw_kb: buf.length / 1024, gzip_kb: zlib.gzipSync(buf).length / 1024,
        content_encoding: r.headers.get('content-encoding') || 'none' };
      console.log(`${server.padEnd(16)} ${label.padEnd(26)} ${r.status} rows=${String(rows).padEnd(6)} ${out[label].raw_kb.toFixed(1)} KB (gzip would be ${out[label].gzip_kb.toFixed(1)} KB)`);
    }
  } finally {
    stopServer(h);
  }
  return out;
}

const result = { current: await measure('backend-current'), before: await measure('backend-before') };
const file = path.join(PERF_ROOT, 'results', 'raw', 'api-payload-sizes.json');
fs.writeFileSync(file, JSON.stringify(result, null, 2));
console.log('Wrote', file);
