// Builds connection strings for the isolated perf DB from backend/.env credentials.
// Never connects to the dev database; only swaps the database name.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

function readDevUrl() {
  if (process.env.PERF_BASE_DB_URL) return process.env.PERF_BASE_DB_URL;
  const envText = fs.readFileSync(path.join(REPO_ROOT, 'backend', '.env'), 'utf8');
  const line = envText.split(/\r?\n/).find((l) => /^\s*DATABASE_URL\s*=/.test(l));
  if (!line) throw new Error('DATABASE_URL not found in backend/.env');
  return line.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
}

export const PERF_DB_NAME = 'agriflow_perf';

export function dbUrl(dbName = PERF_DB_NAME) {
  const u = new URL(readDevUrl());
  if (u.port && u.port !== '5432') throw new Error(`Expected PG15 on 5432, got port ${u.port}`);
  u.pathname = '/' + dbName;
  return u.toString();
}
