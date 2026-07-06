import { test, expect } from '@playwright/test';

const apiURL =
  process.env.PLAYWRIGHT_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8002/api/v1';

test.describe('Backend health API', () => {
  test('liveness returns ok', async ({ request }) => {
    const response = await request.get(`${apiURL}/health/live/`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('readiness returns structured services', async ({ request }) => {
    const response = await request.get(`${apiURL}/health/`);
    const body = await response.json();
    expect(body).toHaveProperty('services');
    expect(body.services).toHaveProperty('database');
  });

  test('prometheus metrics endpoint responds', async ({ request }) => {
    const base = apiURL.replace(/\/api\/v1\/?$/, '');
    const response = await request.get(`${base}/api/metrics/`);
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).toContain('ecm_database_up');
  });
});
