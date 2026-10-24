import fs from 'fs';
import pg from 'pg';

const { Pool } = pg;

const intEnv = (name, fallback) => {
  const n = parseInt(process.env[name], 10);
  return Number.isFinite(n) ? n : fallback;
};

// DB_SSL=true enables TLS (e.g. RDS). With DB_SSL_CA_PATH set, the server cert is
// verified against that CA bundle; otherwise against Node's default CAs.
// Note: sslmode/ssl params in DATABASE_URL override this object in node-pg.
const sslEnabled = ['true', '1'].includes((process.env.DB_SSL || '').toLowerCase());
const ssl = sslEnabled
  ? {
      rejectUnauthorized: true,
      ...(process.env.DB_SSL_CA_PATH && { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8') }),
    }
  : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/agriflow',
  max: intEnv('PG_POOL_MAX', 20),
  idleTimeoutMillis: intEnv('PG_IDLE_TIMEOUT_MS', 30000),
  connectionTimeoutMillis: intEnv('PG_CONNECTION_TIMEOUT_MS', 2000),
  ...(ssl && { ssl }),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
