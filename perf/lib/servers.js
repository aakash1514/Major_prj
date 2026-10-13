// Starts/stops the services under test on perf-only ports against agriflow_perf.
// The dev servers (5000/5001) and the dev database are never used.
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { dbUrl, REPO_ROOT } from './env.js';

export const PERF_ROOT = path.join(REPO_ROOT, 'perf');
export const BEFORE_REF = '2e2a563';
export const BEFORE_DIR = path.join(PERF_ROOT, '.worktrees', `before-${BEFORE_REF}`);
const PY = path.join(REPO_ROOT, '.venv', 'Scripts', 'python.exe');
const LOG_DIR = path.join(PERF_ROOT, 'results', 'raw', 'logs');

// Perf-only secret so tokens are valid on both current and "before" backends.
const JWT_SECRET = 'perf-only-secret-not-used-anywhere-else-0123456789abcdef';

export const SERVERS = {
  'backend-current': { cwd: path.join(REPO_ROOT, 'backend'), cmd: process.execPath, args: ['index.js'], port: 5050, health: '/api/health' },
  'backend-before': { cwd: path.join(BEFORE_DIR, 'backend'), cmd: process.execPath, args: ['index.js'], port: 5051, health: '/api/health' },
  'ml-current-flask': { cwd: path.join(REPO_ROOT, 'ml_service'), cmd: PY, args: ['app.py'], port: 5001, health: '/health' },
  'ml-current-waitress': { cwd: path.join(REPO_ROOT, 'ml_service'), cmd: PY, args: ['-m', 'waitress', '--threads=8', '--listen=127.0.0.1:5001', 'app:app'], port: 5001, health: '/health' },
  'ml-before-flask': { cwd: path.join(BEFORE_DIR, 'ml_service'), cmd: PY, args: ['app.py'], port: 5002, health: '/health' },
  'ml-before-waitress': { cwd: path.join(BEFORE_DIR, 'ml_service'), cmd: PY, args: ['-m', 'waitress', '--threads=8', '--listen=127.0.0.1:5002', 'app:app'], port: 5002, health: '/health' },
};

export const baseUrl = (name) => `http://127.0.0.1:${SERVERS[name].port}`;

function portInUse(port) {
  const out = execSync('netstat -ano', { encoding: 'utf8' });
  return out.split(/\r?\n/).some((l) => /LISTENING/.test(l) && new RegExp(`[:.]${port}\\s`).test(l));
}

export async function startServer(name, { timeoutMs = 120000 } = {}) {
  const s = SERVERS[name];
  // A just-killed server can hold its port for a few seconds; wait before giving up.
  for (let i = 0; i < 40 && portInUse(s.port); i++) await new Promise((r) => setTimeout(r, 500));
  if (portInUse(s.port)) throw new Error(`Port ${s.port} already in use; refusing to start ${name}`);
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const log = fs.openSync(path.join(LOG_DIR, `${name}.log`), 'a');
  const env = {
    ...process.env,
    PORT: String(s.port),
    DATABASE_URL: dbUrl(),
    JWT_SECRET,
    ML_SERVICE_URL: 'http://127.0.0.1:5001',
    ML_SERVICE_PORT: String(s.port),
    FLASK_ENV: 'production',
    PYTHONWARNINGS: 'ignore',
    PYTHONIOENCODING: 'utf-8', // app.py prints '✓'; cp1252 stdout redirection would crash it
    PYTHONDONTWRITEBYTECODE: '1', // keep ml_service/ free of __pycache__
  };
  const child = spawn(s.cmd, s.args, { cwd: s.cwd, env, stdio: ['ignore', log, log], windowsHide: true });
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`${name} exited early with code ${child.exitCode}; see ${LOG_DIR}`);
    try {
      const r = await fetch(baseUrl(name) + s.health);
      if (r.ok) return { name, child, startupMs: Date.now() - t0 };
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  stopServer({ child });
  throw new Error(`${name} did not become healthy within ${timeoutMs}ms`);
}

export function stopServer(handle) {
  if (!handle?.child || handle.child.exitCode !== null) return;
  try { execSync(`taskkill /PID ${handle.child.pid} /T /F`, { stdio: 'ignore' }); } catch { /* already gone */ }
}
