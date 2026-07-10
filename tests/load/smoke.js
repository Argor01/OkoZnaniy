import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency', true);
const base = __ENV.BASE_URL || 'https://okoznaniy.ru';
const auth = __ENV.TOKEN ? { Authorization: `Bearer ${__ENV.TOKEN}` } : {};

export const options = {
  scenarios: {
    public_read_smoke: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 2),
      timeUnit: '1s',
      duration: __ENV.DURATION || '30s',
      preAllocatedVUs: 4,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    errors: ['rate<0.01'],
    api_latency: ['p(95)<700'],
  },
};

export default function () {
  const responses = http.batch([
    ['GET', `${base}/`, null, { tags: { name: 'home' } }],
    ['GET', `${base}/api/shop/works/`, null, { headers: auth, tags: { name: 'shop' } }],
    ['GET', `${base}/api/public/stats/`, null, { headers: auth, tags: { name: 'public_stats' } }],
    ['GET', `${base}/api/users/max_auth_status/load-probe/`, null, { headers: auth, tags: { name: 'max_status' } }],
  ]);
  responses.forEach((r) => {
    const ok = check(r, { 'HTTP status expected': (x) => x.status === 200 || x.status === 404 });
    errorRate.add(!ok);
    apiLatency.add(r.timings.duration);
  });
  sleep(0.2);
}
