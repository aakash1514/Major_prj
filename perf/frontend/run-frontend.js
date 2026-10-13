// Frontend baseline: production build size + Lighthouse (desktop & mobile) on / and /login.
// Builds into perf/.build/dist so frontend/dist is never touched. API calls to the ngrok tunnel are blocked.
// Usage: node frontend/run-frontend.js [--runs 3]
import { execFileSync, spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { PERF_ROOT } from '../lib/servers.js';
import { REPO_ROOT } from '../lib/env.js';
import { median } from '../lib/stats.js';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const RUNS = Number(arg('runs', 3));
const FRONTEND = path.join(REPO_ROOT, 'frontend');
const DIST = path.join(PERF_ROOT, '.build', 'dist');
const VITE = path.join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js');
const PORT = 4173;
const PAGES = ['/', '/login'];
const BLOCKED = ['*ngrok*'];

// ── 1. Build ────────────────────────────────────────────────────────────────
const t0 = Date.now();
execFileSync(process.execPath, [VITE, 'build', '--outDir', DIST, '--emptyOutDir'], { cwd: FRONTEND, stdio: 'inherit' });
const buildSeconds = (Date.now() - t0) / 1000;

const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else {
      const buf = fs.readFileSync(p);
      files.push({ file: path.relative(DIST, p).replace(/\\/g, '/'), ext: path.extname(p), raw_bytes: buf.length,
        gzip_bytes: zlib.gzipSync(buf, { level: 9 }).length, brotli_bytes: zlib.brotliCompressSync(buf).length });
    }
  }
})(DIST);
const sum = (xs, k) => xs.reduce((a, x) => a + x[k], 0);
const js = files.filter((f) => f.ext === '.js');
const css = files.filter((f) => f.ext === '.css');
const bundle = {
  build_seconds: buildSeconds,
  js_files: js.length,
  js_raw_kb: sum(js, 'raw_bytes') / 1024, js_gzip_kb: sum(js, 'gzip_bytes') / 1024, js_brotli_kb: sum(js, 'brotli_bytes') / 1024,
  css_raw_kb: sum(css, 'raw_bytes') / 1024, css_gzip_kb: sum(css, 'gzip_bytes') / 1024,
  total_dist_raw_kb: sum(files, 'raw_bytes') / 1024,
  largest_chunks: [...js].sort((a, b) => b.raw_bytes - a.raw_bytes).slice(0, 5)
    .map((f) => ({ file: f.file, raw_kb: f.raw_bytes / 1024, gzip_kb: f.gzip_bytes / 1024 })),
  files,
  gzip_note: 'gzip level 9 and brotli default, computed with Node zlib on the built files',
};
console.log(`JS: ${bundle.js_files} files, ${bundle.js_raw_kb.toFixed(1)} KB raw / ${bundle.js_gzip_kb.toFixed(1)} KB gzip`);

// ── 2. Preview + Lighthouse ─────────────────────────────────────────────────
const preview = spawn(process.execPath, [VITE, 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
  { cwd: FRONTEND, stdio: 'ignore', windowsHide: true });
const base = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(base)).ok) break; } catch { /* starting */ }
  await new Promise((r) => setTimeout(r, 500));
}

const lh = { blocked_url_patterns: BLOCKED, runs: RUNS, results: {} };
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-first-run'] });
try {
  for (const formFactor of ['desktop', 'mobile']) {
    for (const page of PAGES) {
      const runs = [];
      for (let r = 0; r < RUNS; r++) {
        const flags = { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'], blockedUrlPatterns: BLOCKED };
        const result = await lighthouse(base + page, flags, formFactor === 'desktop' ? desktopConfig : undefined);
        const a = result.lhr.audits;
        const blockedReqs = (a['network-requests']?.details?.items || []).filter((it) => /ngrok/.test(it.url)).length;
        runs.push({
          performance_score: Math.round(result.lhr.categories.performance.score * 100),
          lcp_ms: a['largest-contentful-paint'].numericValue, tbt_ms: a['total-blocking-time'].numericValue,
          cls: a['cumulative-layout-shift'].numericValue, fcp_ms: a['first-contentful-paint'].numericValue,
          speed_index_ms: a['speed-index'].numericValue, ngrok_requests_seen: blockedReqs,
          lighthouse_version: result.lhr.lighthouseVersion, user_agent: result.lhr.environment.hostUserAgent,
        });
        console.log(`${formFactor} ${page} run ${r + 1}: score=${runs.at(-1).performance_score} LCP=${runs.at(-1).lcp_ms.toFixed(0)} TBT=${runs.at(-1).tbt_ms.toFixed(0)} CLS=${runs.at(-1).cls.toFixed(3)}`);
      }
      lh.results[`${formFactor}:${page}`] = {
        median: {
          performance_score: median(runs.map((x) => x.performance_score)),
          lcp_ms: median(runs.map((x) => x.lcp_ms)), tbt_ms: median(runs.map((x) => x.tbt_ms)),
          cls: median(runs.map((x) => x.cls)), fcp_ms: median(runs.map((x) => x.fcp_ms)),
        },
        runs,
      };
    }
  }
} finally {
  await chrome.kill();
  try { execSync(`taskkill /PID ${preview.pid} /T /F`, { stdio: 'ignore' }); } catch { /* gone */ }
}

const file = path.join(PERF_ROOT, 'results', 'raw', 'frontend.json');
fs.writeFileSync(file, JSON.stringify({ bundle, lighthouse: lh }, null, 2));
console.log('Wrote', file);
