/**
 * k6 load smoke test for NPA-ECM API readiness endpoints.
 *
 * Usage:
 *   k6 run scripts/load/k6-smoke.js
 *   BASE_URL=http://staging.example.com/api/v1 k6 run scripts/load/k6-smoke.js
 *
 * Targets (defaults): 50 VUs for 1 minute against health endpoints.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8002/api/v1';
const ROOT_URL = BASE_URL.replace(/\/api\/v1\/?$/, '');

export const options = {
  vus: Number(__ENV.VUS || 50),
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const live = http.get(`${BASE_URL}/health/live/`);
  check(live, {
    'live status 200': (r) => r.status === 200,
  });

  const ready = http.get(`${BASE_URL}/health/`);
  check(ready, {
    'readiness responds': (r) => r.status === 200 || r.status === 503,
  });

  const metrics = http.get(`${ROOT_URL}/api/metrics/`);
  check(metrics, {
    'metrics status 200': (r) => r.status === 200,
    'metrics has database gauge': (r) => r.body && String(r.body).includes('ecm_database_up'),
  });

  sleep(1);
}
