// Creates the agriflow_perf database (if missing) on PG15 and applies the
// backend's own schema via initDatabase().
import pg from 'pg';
import { dbUrl, PERF_DB_NAME } from '../lib/env.js';

const admin = new pg.Client({ connectionString: dbUrl('postgres') });
await admin.connect();
const { rows: [v] } = await admin.query('SHOW server_version');
console.log('Postgres server_version:', v.server_version);
const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [PERF_DB_NAME]);
if (rowCount === 0) {
  await admin.query(`CREATE DATABASE ${PERF_DB_NAME}`);
  console.log(`Created database ${PERF_DB_NAME}`);
} else {
  console.log(`Database ${PERF_DB_NAME} already exists`);
}
await admin.end();

// backend/db.js reads DATABASE_URL at import time; dotenv won't override it.
process.env.DATABASE_URL = dbUrl();
const { initDatabase } = await import('../../backend/models/schema.js');
const { default: pool } = await import('../../backend/db.js');
await initDatabase();
const { rows } = await pool.query(
  "SELECT current_database() db, string_agg(tablename, ', ' ORDER BY tablename) t FROM pg_tables WHERE schemaname='public' GROUP BY 1"
);
console.log('Tables in', rows[0].db + ':', rows[0].t);
await pool.end();
