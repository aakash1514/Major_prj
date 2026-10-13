// EXPLAIN (ANALYZE, BUFFERS) for the most-used controller queries against agriflow_perf.
// SQL is copied verbatim from the controllers (source noted per query).
// Each query: 1 warm-up, then REPS measured runs; median execution time is reported.
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { dbUrl } from '../lib/env.js';
import { median } from '../lib/stats.js';
import { PERF_ROOT } from '../lib/servers.js';

const REPS = Number(process.env.REPS || 5);
const client = new pg.Client({ connectionString: dbUrl() });
await client.connect();

const one = async (sql, p = []) => (await client.query(sql, p)).rows[0];
const buyer = await one("SELECT id FROM users WHERE email = 'buyer1@perf.agriflow.local'");
const farmer = await one("SELECT id FROM users WHERE email = 'farmer1@perf.agriflow.local'");

const QUERIES = [
  { key: 'orders_by_buyer', source: 'backend/controllers/ordersController.js (getAllOrders, buyer branch); same SQL in buyersController.getBuyerOrders',
    sql: 'SELECT * FROM orders WHERE buyer_id = $1 ORDER BY created_at DESC', params: [buyer.id] },
  { key: 'orders_by_farmer_join', source: 'backend/controllers/ordersController.js (getAllOrders, farmer branch); same SQL in farmersController.getFarmerOrders',
    sql: 'SELECT o.* FROM orders o JOIN crops c ON o.crop_id = c.id WHERE c.farmer_id = $1 ORDER BY o.created_at DESC', params: [farmer.id] },
  { key: 'crops_list', source: 'backend/controllers/cropsController.js (getAllCrops, public GET /api/crops)',
    sql: 'SELECT * FROM crops ORDER BY created_at DESC', params: [] },
  { key: 'admin_all_orders_unpaginated', source: 'backend/controllers/ordersController.js (getAllOrders, admin branch: GET /api/orders as admin)',
    sql: 'SELECT * FROM orders ORDER BY created_at DESC', params: [] },
  { key: 'admin_orders_paginated_page1', source: 'backend/controllers/adminController.js (getAllOrders: GET /api/admin/orders, default limit 20)',
    sql: `SELECT o.*, c.name as crop_name, u.name as buyer_name FROM orders o
         JOIN crops c ON o.crop_id = c.id
         JOIN users u ON o.buyer_id = u.id
         ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`, params: [20, 0] },
  { key: 'admin_orders_paginated_last_page', source: 'same as above, last page (OFFSET 9980) to show OFFSET cost',
    sql: `SELECT o.*, c.name as crop_name, u.name as buyer_name FROM orders o
         JOIN crops c ON o.crop_id = c.id
         JOIN users u ON o.buyer_id = u.id
         ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`, params: [20, 9980] },
  { key: 'admin_orders_count', source: 'backend/controllers/adminController.js (getAllOrders count query, runs on every page)',
    sql: 'SELECT COUNT(*)::int as total FROM orders', params: [] },
  { key: 'login_lookup_by_email', source: 'backend/controllers/usersController.js (login)',
    sql: 'SELECT * FROM users WHERE email = $1', params: ['buyer1@perf.agriflow.local'] },
];

function walk(node, acc = []) {
  acc.push({ type: node['Node Type'], relation: node['Relation Name'] || null, index: node['Index Name'] || null,
    actual_rows: node['Actual Rows'], sort_method: node['Sort Method'] || null, sort_space_kb: node['Sort Space Used'] || null,
    sort_space_type: node['Sort Space Type'] || null });
  (node.Plans || []).forEach((p) => walk(p, acc));
  return acc;
}

const out = { reps: REPS, queries: {} };
for (const q of QUERIES) {
  const explain = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${q.sql}`;
  await client.query(explain, q.params); // warm-up
  const runs = [];
  let plan;
  for (let i = 0; i < REPS; i++) {
    const r = (await client.query(explain, q.params)).rows[0]['QUERY PLAN'][0];
    runs.push({ execution_ms: r['Execution Time'], planning_ms: r['Planning Time'] });
    plan = r;
  }
  const nodes = walk(plan.Plan);
  const scans = nodes.filter((n) => /Scan/.test(n.type));
  out.queries[q.key] = {
    source: q.source, sql: q.sql.replace(/\s+/g, ' '),
    median_execution_ms: median(runs.map((r) => r.execution_ms)),
    median_planning_ms: median(runs.map((r) => r.planning_ms)),
    rows_returned: plan.Plan['Actual Rows'],
    scan_types: scans.map((s) => `${s.type} on ${s.relation}${s.index ? ` using ${s.index}` : ''}`),
    has_seq_scan: scans.some((s) => s.type === 'Seq Scan'),
    sorts: nodes.filter((n) => n.sort_method).map((n) => `${n.sort_method} (${n.sort_space_kb} kB ${n.sort_space_type})`),
    runs, plan_nodes: nodes,
  };
  const o = out.queries[q.key];
  console.log(`${q.key.padEnd(34)} ${o.median_execution_ms.toFixed(3).padStart(9)} ms  rows=${String(o.rows_returned).padEnd(6)} ${o.scan_types.join('; ')} ${o.sorts.join('; ')}`);
}

out.existing_indexes = (await client.query(
  "SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('users','crops','orders') ORDER BY 1,2"
)).rows;
out.table_sizes = (await client.query(
  "SELECT relname AS table, n_live_tup::int AS rows, pg_size_pretty(pg_total_relation_size(relid)) AS total_size FROM pg_stat_user_tables WHERE relname IN ('users','crops','orders') ORDER BY 1"
)).rows;
await client.end();

const file = path.join(PERF_ROOT, 'results', 'raw', 'db-explain.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log('Existing indexes:', out.existing_indexes.map((i) => i.indexname).join(', '));
console.log('Wrote', file);
