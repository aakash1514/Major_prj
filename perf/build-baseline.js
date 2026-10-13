// Merges every raw result in results/raw/ plus test-environment details into results/baseline-<YYYY-MM-DD>.json.
// Usage: node build-baseline.js [--date 2026-10-13] [--label baseline]
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import pg from 'pg';
import { dbUrl, REPO_ROOT } from './lib/env.js';
import { VOLUMES } from './seed.js';
import { PERF_ROOT, BEFORE_REF } from './lib/servers.js';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const date = arg('date', new Date().toISOString().slice(0, 10));
const label = arg('label', 'baseline');
const RAW = path.join(PERF_ROOT, 'results', 'raw');
const read = (f) => (fs.existsSync(path.join(RAW, f)) ? JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8')) : null);
const sh = (cmd) => { try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const txt = (f) => (fs.existsSync(path.join(RAW, f)) ? fs.readFileSync(path.join(RAW, f), 'utf8').trim() : null);

const client = new pg.Client({ connectionString: dbUrl() });
await client.connect();
const pgVersion = (await client.query('SHOW server_version')).rows[0].server_version;
const counts = (await client.query(`SELECT
  (SELECT COUNT(*) FROM users WHERE role='farmer')::int farmers, (SELECT COUNT(*) FROM users WHERE role='buyer')::int buyers,
  (SELECT COUNT(*) FROM users WHERE role='agent')::int agents, (SELECT COUNT(*) FROM users WHERE role='admin')::int admins,
  (SELECT COUNT(*) FROM crops)::int crops, (SELECT COUNT(*) FROM orders)::int orders`)).rows[0];
await client.end();

const cpuName = (sh('reg query "HKLM\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0" /v ProcessorNameString') || '')
  .split(/\r?\n/).find((l) => /ProcessorNameString/.test(l))?.split('REG_SZ')[1]?.trim() || os.cpus()[0].model;
const py = path.join(REPO_ROOT, '.venv', 'Scripts', 'python.exe');
const lhPkg = JSON.parse(fs.readFileSync(path.join(PERF_ROOT, 'node_modules', 'lighthouse', 'package.json'), 'utf8'));
const vitePkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'frontend', 'node_modules', 'vite', 'package.json'), 'utf8'));

const baseline = {
  label, date,
  git: { commit: sh('git rev-parse --short HEAD'), branch: sh('git rev-parse --abbrev-ref HEAD'), before_ref: BEFORE_REF },
  environment: {
    note: 'All services, the database, the load generator and Lighthouse ran on the same machine (localhost).',
    cpu: cpuName, logical_cpus: os.cpus().length, ram_total_gb: +(os.totalmem() / 2 ** 30).toFixed(1),
    os: `${os.version()} (${os.release()})`, node: process.version,
    python: sh(`"${py}" --version`), postgres: pgVersion, k6: sh('"C:\\Program Files\\k6\\k6.exe" version'),
    lighthouse: lhPkg.version, vite: vitePkg.version,
    python_packages: sh(`"${py}" -m pip freeze`)?.split(/\r?\n/).filter((l) => /^(flask|waitress|xgboost|scikit-learn|pandas|numpy|joblib)==/i.test(l)),
    load_window: { started: txt('load-started.txt'), finished: txt('load-finished.txt') },
  },
  seed: { target_volumes: VOLUMES, actual_counts: counts },
  api: { current: read('api-current.json'), before: read('api-before.json'), payload_sizes: read('api-payload-sizes.json') },
  ml: { load: read('ml-load.json'), cold_load: read('ml-cold-load.json'), eval: read('ml-eval.json') },
  db: read('db-explain.json'),
  frontend: read('frontend.json'),
};

const out = path.join(PERF_ROOT, 'results', `${label}-${date}.json`);
fs.writeFileSync(out, JSON.stringify(baseline, null, 2));
console.log('Wrote', out, `(${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
