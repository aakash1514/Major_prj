// Benchmarks the ML service: 200 sequential requests (latency) and 20 VUs x 60s (throughput),
// per model, per server variant, N runs each; records medians and min free system RAM per run.
// Usage: node load/run-ml.js [--servers ml-current-waitress,ml-current-flask] [--runs 3] [--skip ml-before-flask:price:conc]
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PERF_ROOT, startServer, stopServer, baseUrl } from '../lib/servers.js';
import { median } from '../lib/stats.js';

const K6 = process.env.K6_BIN || 'C:\\Program Files\\k6\\k6.exe';
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const servers = arg('servers', 'ml-current-waitress,ml-current-flask,ml-before-waitress,ml-before-flask').split(',');
const runs = Number(arg('runs', 3));
const n = arg('n', '200');
const vus = arg('vus', '20');
const duration = arg('duration', '60s');
const skip = new Set(arg('skip', '').split(',').filter(Boolean));
const tag = arg('tag', '');
const resume = process.argv.includes('--resume'); // reuse run files already on disk
// --limit server:model:mode=N caps runs for one test (used where repeating would endanger the machine)
const limits = Object.fromEntries(arg('limit', '').split(',').filter(Boolean).map((x) => x.split('=')).map(([k, v]) => [k, Number(v)]));
const outDir = path.join(PERF_ROOT, 'results', 'raw', 'ml' + tag);
fs.mkdirSync(outDir, { recursive: true });

function k6(env) {
  return new Promise((resolve, reject) => {
    let minFree = os.freemem();
    const timer = setInterval(() => { minFree = Math.min(minFree, os.freemem()); }, 500);
    const args = ['run', '--quiet', '--no-color', ...Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]), path.join(PERF_ROOT, 'load', 'ml.js')];
    execFile(K6, args, { maxBuffer: 1 << 24 }, (err, _so, se) => {
      clearInterval(timer);
      if (err) return reject(new Error(se || err.message));
      resolve(minFree / 2 ** 20);
    });
  });
}

const summaryFile = path.join(PERF_ROOT, 'results', 'raw', `ml-load${tag}.json`);
const summary = fs.existsSync(summaryFile) ? JSON.parse(fs.readFileSync(summaryFile, 'utf8')) : {};

for (const server of servers) {
  const handle = await startServer(server);
  console.log(`${server} up in ${handle.startupMs}ms`);
  summary[server] = { base_url: baseUrl(server), startup_ms: handle.startupMs, results: {} };
  try {
    for (const model of ['price', 'demand']) {
      for (const mode of ['seq', 'conc']) {
        const key = `${model}:${mode}`;
        if (skip.has(`${server}:${key}`)) {
          summary[server].results[key] = { skipped: true, reason: arg('skip-reason', 'skipped via --skip') };
          console.log(`[${server}] ${key} SKIPPED`);
          continue;
        }
        const rs = [];
        const nRuns = limits[`${server}:${key}`] ?? runs;
        for (let r = 1; r <= nRuns; r++) {
          const out = path.join(outDir, `${server}-${model}-${mode}-run${r}.json`);
          if (resume && fs.existsSync(out) && JSON.parse(fs.readFileSync(out, 'utf8')).min_free_ram_mb !== undefined) {
            rs.push(JSON.parse(fs.readFileSync(out, 'utf8')));
            console.log(`[${server}] ${key} run ${r}/${nRuns} reused from disk`);
            continue;
          }
          process.stdout.write(`[${server}] ${key} run ${r}/${runs} ... `);
          const minFreeMb = await k6({ MODE: mode, MODEL: model, BASE_URL: baseUrl(server), N: n, VUS: vus, DURATION: duration, OUT: out });
          const res = { ...JSON.parse(fs.readFileSync(out, 'utf8')), min_free_ram_mb: minFreeMb };
          fs.writeFileSync(out, JSON.stringify(res, null, 2));
          rs.push(res);
          console.log(`p50=${res.latency_ms.p50.toFixed(1)} p95=${res.latency_ms.p95.toFixed(1)} rps=${res.rps?.toFixed(1) ?? '-'} 5xx=${res.status.server_5xx} 4xx=${res.status.client_4xx} net=${res.status.network_or_timeout} minFree=${minFreeMb.toFixed(0)}MB`);
          await new Promise((t) => setTimeout(t, 3000));
        }
        summary[server].results[key] = {
          runs_completed: rs.length,
          ...(nRuns < runs ? { note: arg('limit-reason', `limited to ${nRuns} run(s)`) } : {}),
          median: {
            p50_ms: median(rs.map((x) => x.latency_ms.p50)),
            p95_ms: median(rs.map((x) => x.latency_ms.p95)),
            p99_ms: median(rs.map((x) => x.latency_ms.p99)),
            rps: mode === 'conc' ? median(rs.map((x) => x.rps)) : null,
            error_rate_5xx_timeout: median(rs.map((x) => x.error_rate_5xx_timeout)),
            min_free_ram_mb: Math.min(...rs.map((x) => x.min_free_ram_mb)),
          },
          runs: rs,
        };
      }
    }
  } finally {
    stopServer(handle);
  }
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
}
console.log('Wrote', summaryFile);
