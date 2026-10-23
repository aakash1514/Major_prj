// k6 load test for the AgriFlow backend.
// Usage: k6 run -e SCENARIO=crops_list -e BASE_URL=http://127.0.0.1:5050 -e OUT=results/raw/x.json load/api.js
// Each run: 10s warm-up at VUS, then DURATION at VUS. Only the "main" phase is reported.
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import exec from 'k6/execution';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:5050';
const SCENARIO = __ENV.SCENARIO;
const VUS = Number(__ENV.VUS || 50);
const DURATION = __ENV.DURATION || '60s';
const WARMUP = __ENV.WARMUP || '10s';
const PASSWORD = 'PerfTest@123';
const DOMAIN = 'perf.agriflow.local';
const JSON_HDR = { 'Content-Type': 'application/json' };

// Counters only incremented during the main phase.
const reqMain = new Counter('main_requests');
const ok2xx = new Counter('main_2xx');
const biz4xx = new Counter('main_4xx');
const err5xx = new Counter('main_5xx');
const errNet = new Counter('main_network_or_timeout');
const respKB = new Trend('main_response_kb');
const latency = new Trend('main_latency_ms', true);

export const options = {
  discardResponseBodies: false,
  summaryTrendStats: ['min', 'med', 'p(50)', 'p(95)', 'p(99)', 'max', 'avg'],
  scenarios: {
    warmup: { executor: 'constant-vus', vus: VUS, duration: WARMUP, gracefulStop: '0s', tags: { phase: 'warmup' } },
    main: { executor: 'constant-vus', vus: VUS, duration: DURATION, startTime: WARMUP, gracefulStop: '30s', tags: { phase: 'main' } },
  },
};

function login(emailAddr) {
  const r = http.post(`${BASE}/api/users/login`, JSON.stringify({ email: emailAddr, password: PASSWORD }), { headers: JSON_HDR });
  if (r.status !== 200) throw new Error(`setup login failed for ${emailAddr}: ${r.status} ${r.body}`);
  return r.json('token');
}

export function setup() {
  const crops = http.get(`${BASE}/api/crops?limit=100`, { timeout: '120s' });
  if (crops.status !== 200) throw new Error(`setup GET /api/crops failed: ${crops.status}`);
  // Paginated { crops, pagination } since the crops-list fix; older backends return a bare array.
  const body = crops.json();
  const list = Array.isArray(body) ? body : body.crops;
  const cropIds = list.map((c) => c.id);
  const cropPrices = list.map((c) => Number(c.price) || 1);
  const buyerTokens = [];
  for (let i = 1; i <= 10; i++) buyerTokens.push(login(`buyer${i}@${DOMAIN}`));
  return { cropIds, cropPrices, buyerTokens, adminToken: login(`admin1@${DOMAIN}`) };
}

const auth = (t) => ({ headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, timeout: '30s' });
const rnd = (n) => Math.floor(Math.random() * n);

function request(data) {
  switch (SCENARIO) {
    case 'crops_list':
      return http.get(`${BASE}/api/crops`, { timeout: '30s' });
    case 'crop_by_id':
      return http.get(`${BASE}/api/crops/${data.cropIds[rnd(data.cropIds.length)]}`, { timeout: '30s' });
    case 'login': {
      const role = Math.random() < 0.8 ? 'buyer' : 'farmer';
      const i = 1 + rnd(role === 'buyer' ? 200 : 50);
      return http.post(`${BASE}/api/users/login`, JSON.stringify({ email: `${role}${i}@${DOMAIN}`, password: PASSWORD }), { headers: JSON_HDR, timeout: '30s' });
    }
    case 'orders_buyer':
      return http.get(`${BASE}/api/orders`, auth(data.buyerTokens[rnd(data.buyerTokens.length)]));
    case 'orders_admin':
      return http.get(`${BASE}/api/orders`, auth(data.adminToken));
    case 'admin_orders':
      return http.get(`${BASE}/api/admin/orders`, auth(data.adminToken));
    case 'admin_users':
      return http.get(`${BASE}/api/admin/users`, auth(data.adminToken));
    case 'admin_crops':
      return http.get(`${BASE}/api/admin/crops`, auth(data.adminToken));
    case 'create_order': {
      const k = rnd(data.cropIds.length);
      const body = { cropId: data.cropIds[k], quantity: 1, totalAmount: data.cropPrices[k], advanceAmount: 0 };
      return http.post(`${BASE}/api/orders`, JSON.stringify(body), auth(data.buyerTokens[rnd(data.buyerTokens.length)]));
    }
    default:
      throw new Error(`Unknown SCENARIO ${SCENARIO}`);
  }
}

export default function (data) {
  const res = request(data);
  if (exec.scenario.name !== 'main') return;
  reqMain.add(1);
  latency.add(res.timings.duration);
  if (res.status === 0) errNet.add(1);
  else if (res.status >= 500) err5xx.add(1);
  else if (res.status >= 400) biz4xx.add(1);
  else ok2xx.add(1);
  if (res.body) respKB.add(res.body.length / 1024);
}

export function handleSummary(data) {
  const m = data.metrics;
  const v = (name, key) => (m[name] && m[name].values[key] !== undefined ? m[name].values[key] : 0);
  const total = v('main_requests', 'count');
  const durS = parseFloat(DURATION);
  const out = {
    scenario: SCENARIO, base_url: BASE, vus: VUS, duration_s: durS, warmup: WARMUP,
    requests: total,
    rps: total / durS,
    latency_ms: { p50: v('main_latency_ms', 'p(50)'), p95: v('main_latency_ms', 'p(95)'), p99: v('main_latency_ms', 'p(99)'),
      avg: v('main_latency_ms', 'avg'), max: v('main_latency_ms', 'max') },
    status: { ok_2xx: v('main_2xx', 'count'), client_4xx: v('main_4xx', 'count'), server_5xx: v('main_5xx', 'count'),
      network_or_timeout: v('main_network_or_timeout', 'count') },
    error_rate_5xx_timeout: total ? (v('main_5xx', 'count') + v('main_network_or_timeout', 'count')) / total : 0,
    rejection_rate_4xx: total ? v('main_4xx', 'count') / total : 0,
    response_kb: { avg: v('main_response_kb', 'avg'), max: v('main_response_kb', 'max') },
  };
  const result = { stdout: `${SCENARIO}: ${JSON.stringify(out)}\n` };
  if (__ENV.OUT) result[__ENV.OUT] = JSON.stringify(out, null, 2);
  return result;
}
