// Gentle, read-only k6 load test against the LIVE AgriFlow API.
// Usage (from repo root):
//   k6 run -e BUYER_PASSWORD=<demo password> perf/load/prod.js
// Optional: -e VUS=10 -e HOLD=2m -e ML_RATE=1 -e BUYER_EMAIL=buyer@example.com -e BASE_URL=https://api.agriflow.me
// Dry run:  k6 run -e BUYER_PASSWORD=<pw> -e VUS=1 -e HOLD=20s perf/load/prod.js
//
// What it does:
//   browse   : ramps 0 -> VUS over 30s, holds for HOLD, ramps down 30s. Each virtual user behaves like
//              a buyer: list crops, open one crop, sometimes check their orders, with 1-3 s think time.
//   ml_price : ML_RATE price predictions per second (default 1) during the hold — the price model is the
//              heaviest endpoint (~3.5 req/s max on the server), so keep this low.
// Nothing is created, changed or paid. One login happens in setup().
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = (__ENV.BASE_URL || 'https://api.agriflow.me').replace(/\/$/, '');
const EMAIL = __ENV.BUYER_EMAIL || 'buyer@example.com';
const PASSWORD = __ENV.BUYER_PASSWORD;
const VUS = Number(__ENV.VUS || 10);
const HOLD = __ENV.HOLD || '2m';
const ML_RATE = Number(__ENV.ML_RATE || 1);

const PRICE_PAYLOAD = JSON.stringify({
  features: {
    'State Name': 1, 'District Name': 1, 'Market Name': 1, Variety: 1, Group: 1, Grade: 1,
    'Arrivals (Tonnes)': 100, Month: 4, Day: 16, Weekday: 2,
  },
});

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      exec: 'browse',
      startVUs: 0,
      stages: [
        { duration: '30s', target: VUS },
        { duration: HOLD, target: VUS },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
    ml_price: {
      executor: 'constant-arrival-rate',
      exec: 'mlPrice',
      rate: ML_RATE,
      timeUnit: '1s',
      duration: HOLD,
      startTime: '30s',
      preAllocatedVUs: 3,
      maxVUs: 5,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{scenario:browse}': ['p(95)<800'],
    'http_req_duration{scenario:ml_price}': ['p(95)<3000'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const think = () => sleep(1 + Math.random() * 2);

export function setup() {
  if (!PASSWORD) throw new Error('Pass the demo password: -e BUYER_PASSWORD=...');

  const login = http.post(`${BASE}/api/users/login`, JSON.stringify({ email: EMAIL, password: PASSWORD }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'setup login' },
  });
  if (login.status !== 200) throw new Error(`Login failed: ${login.status}`);
  const token = login.json('token');

  const crops = http.get(`${BASE}/api/crops?limit=100`, { tags: { name: 'setup crops' } });
  if (crops.status !== 200) throw new Error(`GET /api/crops failed: ${crops.status}`);
  const body = crops.json();
  const list = Array.isArray(body) ? body : body.crops;
  const cropIds = (list || []).map((c) => c.id);
  if (cropIds.length === 0) throw new Error('No crops returned — list some crops first');

  console.log(`setup ok: ${cropIds.length} crops, logged in as ${EMAIL}`);
  return { token, cropIds };
}

export function browse(data) {
  const auth = { headers: { Authorization: `Bearer ${data.token}` } };

  const list = http.get(`${BASE}/api/crops`, { tags: { name: 'GET /api/crops' } });
  check(list, { 'crops list 200': (r) => r.status === 200 });
  think();

  const id = data.cropIds[Math.floor(Math.random() * data.cropIds.length)];
  const one = http.get(`${BASE}/api/crops/${id}`, { tags: { name: 'GET /api/crops/:id' } });
  check(one, { 'crop by id 200': (r) => r.status === 200 });
  think();

  if (Math.random() < 0.3) {
    const orders = http.get(`${BASE}/api/orders`, { ...auth, tags: { name: 'GET /api/orders (buyer)' } });
    check(orders, { 'my orders 200': (r) => r.status === 200 });
    think();
  }
}

export function mlPrice(data) {
  const r = http.post(`${BASE}/api/predictions/price`, PRICE_PAYLOAD, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
    timeout: '60s',
    tags: { name: 'POST /api/predictions/price' },
  });
  check(r, { 'price prediction 200': (res) => res.status === 200 });
}