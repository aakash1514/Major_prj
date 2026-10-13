// k6 test for the ML service.
// MODE=seq : 10 warm-up requests, then 200 sequential requests (1 VU)   -> single-request latency
// MODE=conc: 10s warm-up, then 60s at 20 VUs                            -> throughput under concurrency
// Usage: k6 run -e MODE=seq -e MODEL=price -e BASE_URL=http://127.0.0.1:5001 -e OUT=x.json load/ml.js
import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';
import exec from 'k6/execution';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:5001';
const MODE = __ENV.MODE || 'seq';
const MODEL = __ENV.MODEL || 'price';
const N = Number(__ENV.N || 200);
const VUS = Number(__ENV.VUS || 20);
const DURATION = __ENV.DURATION || '60s';

// Payloads follow ml_service/README.md.
const PAYLOADS = {
  price: { features: { 'State Name': 1, 'District Name': 1, 'Market Name': 1, Variety: 1, Group: 1, Grade: 1, 'Arrivals (Tonnes)': 100, Month: 4, Day: 16, Weekday: 2 } },
  // Wheat 2023 row from final.csv: Year, food supply, GDP/capita, population, then 12 one-hot item columns.
  demand: { features: [2023, 62.77, 2484.85, 1428627663, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
};
const BODY = JSON.stringify(PAYLOADS[MODEL]);
const PARAMS = { headers: { 'Content-Type': 'application/json' }, timeout: '120s' };

const reqMain = new Counter('main_requests');
const ok2xx = new Counter('main_2xx');
const biz4xx = new Counter('main_4xx');
const err5xx = new Counter('main_5xx');
const errNet = new Counter('main_network_or_timeout');
const latency = new Trend('main_latency_ms', true);

export const options = {
  summaryTrendStats: ['min', 'med', 'p(50)', 'p(95)', 'p(99)', 'max', 'avg'],
  scenarios: MODE === 'seq'
    ? { seq: { executor: 'shared-iterations', vus: 1, iterations: N + 10, maxDuration: '60m' } }
    : {
        warmup: { executor: 'constant-vus', vus: VUS, duration: '10s', gracefulStop: '0s' },
        main: { executor: 'constant-vus', vus: VUS, duration: DURATION, startTime: '10s', gracefulStop: '120s' },
      },
};

export default function () {
  const res = http.post(`${BASE}/predict/${MODEL}`, BODY, PARAMS);
  const measured = MODE === 'seq' ? exec.scenario.iterationInTest >= 10 : exec.scenario.name === 'main';
  if (!measured) return;
  reqMain.add(1);
  latency.add(res.timings.duration);
  if (res.status === 0) errNet.add(1);
  else if (res.status >= 500) err5xx.add(1);
  else if (res.status >= 400) biz4xx.add(1);
  else ok2xx.add(1);
}

export function handleSummary(data) {
  const m = data.metrics;
  const v = (name, key) => (m[name] && m[name].values[key] !== undefined ? m[name].values[key] : 0);
  const total = v('main_requests', 'count');
  const mainDurS = data.state.testRunDurationMs / 1000;
  const out = {
    mode: MODE, model: MODEL, base_url: BASE, vus: MODE === 'seq' ? 1 : VUS, requests: total,
    duration_s: MODE === 'seq' ? null : parseFloat(DURATION),
    rps: MODE === 'seq' ? null : total / parseFloat(DURATION),
    test_run_duration_s: mainDurS,
    latency_ms: { p50: v('main_latency_ms', 'p(50)'), p95: v('main_latency_ms', 'p(95)'), p99: v('main_latency_ms', 'p(99)'),
      avg: v('main_latency_ms', 'avg'), max: v('main_latency_ms', 'max') },
    status: { ok_2xx: v('main_2xx', 'count'), client_4xx: v('main_4xx', 'count'), server_5xx: v('main_5xx', 'count'),
      network_or_timeout: v('main_network_or_timeout', 'count') },
    error_rate_5xx_timeout: total ? (v('main_5xx', 'count') + v('main_network_or_timeout', 'count')) / total : 0,
  };
  const result = { stdout: `${MODEL}/${MODE}: ${JSON.stringify(out)}\n` };
  if (__ENV.OUT) result[__ENV.OUT] = JSON.stringify(out, null, 2);
  return result;
}
