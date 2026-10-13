// Re-runnable seed for the isolated perf DB (agriflow_perf). Truncates, then inserts.
// Usage: node seed.js
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import pg from 'pg';
import { dbUrl, PERF_DB_NAME } from './lib/env.js';

export const VOLUMES = { farmers: 50, buyers: 200, agents: 10, admins: 1, crops: 2000, orders: 10000 };
export const PASSWORD = 'PerfTest@123';
export const email = (role, i) => `${role}${i}@perf.agriflow.local`;

// Deterministic PRNG so every run produces the same distribution.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const daysAgo = (d) => new Date(Date.now() - d * 86400000 - int(0, 86399) * 1000);

const CROP_NAMES = ['Wheat', 'Rice', 'Maize', 'Millet', 'Onion', 'Tomato', 'Potato', 'Soybean', 'Groundnut', 'Sugarcane', 'Orange', 'Pepper'];
const CITIES = ['Pune', 'Nashik', 'Nagpur', 'Indore', 'Bhopal', 'Jaipur', 'Lucknow', 'Ludhiana', 'Hyderabad', 'Bengaluru'];
const CROP_STATUSES = [...Array(6).fill('listed'), 'approved', 'approved', 'pending', 'inspected', 'rejected', 'sold'];
const ORDER_STATUSES = ['pending', 'confirmed', 'assigned', 'in-transit', 'delivered'];
const PAY_STATUSES = ['pending', 'advance-paid', 'fully-paid'];

async function insertBatched(client, table, cols, rows, batch = 1000) {
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const params = [];
    const tuples = chunk.map((r) => '(' + r.map((v) => (params.push(v), `$${params.length}`)).join(',') + ')');
    await client.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${tuples.join(',')}`, params);
  }
}

export async function seed_db() {
  const url = dbUrl();
  if (!url.endsWith('/' + PERF_DB_NAME)) throw new Error('Refusing to seed a non-perf database');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const t0 = Date.now();
  seed = 42;

  const hash = await bcrypt.hash(PASSWORD, 10); // same cost as usersController.register

  await client.query('BEGIN');
  await client.query(
    'TRUNCATE users, farmers, buyers, crops, orders, quality_reports, transport_logs, marketplace_listings, payment_audit_logs RESTART IDENTITY CASCADE'
  );

  const users = [];
  const byRole = { farmer: [], buyer: [], agent: [], admin: [] };
  const addUsers = (role, n) => {
    for (let i = 1; i <= n; i++) {
      const id = crypto.randomUUID();
      byRole[role].push(id);
      const city = pick(CITIES);
      users.push([id, `${role[0].toUpperCase()}${role.slice(1)} ${i}`, email(role, i), hash, role, city,
        `9${String(int(100000000, 999999999))}`, true, daysAgo(int(200, 400))]);
    }
  };
  addUsers('farmer', VOLUMES.farmers);
  addUsers('buyer', VOLUMES.buyers);
  addUsers('agent', VOLUMES.agents);
  addUsers('admin', VOLUMES.admins);
  await insertBatched(client, 'users',
    ['id', 'name', 'email', 'password', 'role', 'location', 'contact_number', 'kyc', 'created_at'], users);

  await insertBatched(client, 'farmers', ['id', 'farm_size', 'farm_location', 'years_of_experience'],
    byRole.farmer.map((id) => [id, int(1, 50), pick(CITIES), int(1, 30)]));
  await insertBatched(client, 'buyers', ['id', 'company_name', 'business_type'],
    byRole.buyer.map((id, i) => [id, `Buyer Co ${i + 1}`, pick(['retail', 'wholesale', 'processor'])]));

  const crops = [];
  for (let i = 0; i < VOLUMES.crops; i++) {
    const name = pick(CROP_NAMES);
    crops.push([crypto.randomUUID(), byRole.farmer[i % VOLUMES.farmers], name,
      100000, 'kg', daysAgo(int(10, 120)), `Fresh ${name.toLowerCase()} from ${pick(CITIES)}. Grade A, sorted and packed.`,
      [], pick(CROP_STATUSES), int(15, 120), 'Standard terms apply', daysAgo(int(1, 365))]);
  }
  await insertBatched(client, 'crops',
    ['id', 'farmer_id', 'name', 'quantity', 'unit', 'harvest_date', 'description', 'images', 'status', 'price', 'tac', 'created_at'], crops);

  const orders = [];
  for (let i = 0; i < VOLUMES.orders; i++) {
    const crop = crops[int(0, crops.length - 1)];
    const qty = int(10, 500);
    const total = qty * Number(crop[9]);
    const status = pick(ORDER_STATUSES);
    const transporter = ['assigned', 'in-transit', 'delivered'].includes(status) ? pick(byRole.agent) : null;
    orders.push([byRole.buyer[i % VOLUMES.buyers], crop[0], status, pick(PAY_STATUSES), Math.round(total * 0.2), total, qty,
      transporter, daysAgo(int(0, 365))]);
  }
  await insertBatched(client, 'orders',
    ['buyer_id', 'crop_id', 'status', 'payment_status', 'advance_amount', 'total_amount', 'quantity', 'transporter_id', 'created_at'], orders);

  await client.query('COMMIT');
  await client.query('ANALYZE');

  const { rows } = await client.query(`SELECT
    (SELECT COUNT(*) FROM users WHERE role='farmer')::int farmers,
    (SELECT COUNT(*) FROM users WHERE role='buyer')::int buyers,
    (SELECT COUNT(*) FROM users WHERE role='agent')::int agents,
    (SELECT COUNT(*) FROM users WHERE role='admin')::int admins,
    (SELECT COUNT(*) FROM crops)::int crops,
    (SELECT COUNT(*) FROM orders)::int orders`);
  await client.end();
  return { counts: rows[0], seconds: (Date.now() - t0) / 1000 };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('seed.js')) {
  const r = await seed_db();
  console.log('Seeded', PERF_DB_NAME, JSON.stringify(r.counts), `in ${r.seconds}s`);
  console.log(`Login with e.g. ${email('buyer', 1)} / ${PASSWORD}`);
}
