import { expect, test } from '@playwright/test';
import { loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();
const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000';
const apiUrl = `${apiBase}/api`;

test.describe('API auth', () => {
  test('client can fetch own profile', async ({ request }) => {
    const login = await request.post(`${apiUrl}/users/token/`, {
      data: { username: fixtures.client.email, password: fixtures.password },
    });
    expect(login.ok()).toBeTruthy();
    const auth = await login.json();

    const me = await request.get(`${apiUrl}/users/me/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
    });
    expect(me.ok()).toBeTruthy();
    const data = await me.json();
    expect(data.email).toBe(fixtures.client.email);
    expect(data.role).toBe('client');
  });

  test('expert can fetch own profile', async ({ request }) => {
    const login = await request.post(`${apiUrl}/users/token/`, {
      data: { username: fixtures.expert.email, password: fixtures.password },
    });
    expect(login.ok()).toBeTruthy();
    const auth = await login.json();

    const me = await request.get(`${apiUrl}/users/me/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
    });
    expect(me.ok()).toBeTruthy();
    const data = await me.json();
    expect(data.email).toBe(fixtures.expert.email);
    expect(data.role).toBe('expert');
  });

  test('invalid credentials are rejected', async ({ request }) => {
    const response = await request.post(`${apiUrl}/users/token/`, {
      data: { username: fixtures.client.email, password: 'wrong-password' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('partner registration works', async ({ request }) => {
    const runId = Date.now();
    const email = `partner.${runId}@e2e.local`;
    const response = await request.post(`${apiUrl}/users/`, {
      data: {
        email,
        username: `partner_${runId}`,
        password: fixtures.password,
        password2: fixtures.password,
        role: 'partner',
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.email).toBe(email);
  });

  test('fresh partner can login', async ({ request }) => {
    const runId = Date.now() + 1;
    const email = `partner.login.${runId}@e2e.local`;
    await request.post(`${apiUrl}/users/`, {
      data: {
        email,
        username: `partner_login_${runId}`,
        password: fixtures.password,
        password2: fixtures.password,
        role: 'partner',
      },
    });

    const response = await request.post(`${apiUrl}/users/token/`, {
      data: { username: email, password: fixtures.password },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.user.role).toBe('partner');
    expect(data.access).toBeTruthy();
  });

  test('partner profile returns partner role', async ({ request }) => {
    const runId = Date.now() + 2;
    const email = `partner.me.${runId}@e2e.local`;
    await request.post(`${apiUrl}/users/`, {
      data: {
        email,
        username: `partner_me_${runId}`,
        password: fixtures.password,
        password2: fixtures.password,
        role: 'partner',
      },
    });

    const login = await request.post(`${apiUrl}/users/token/`, {
      data: { username: email, password: fixtures.password },
    });
    const auth = await login.json();
    const me = await request.get(`${apiUrl}/users/me/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
    });
    expect(me.ok()).toBeTruthy();
    const data = await me.json();
    expect(data.role).toBe('partner');
  });

  test('refresh token returns a new access token', async ({ request }) => {
    const login = await request.post(`${apiUrl}/users/token/`, {
      data: { username: fixtures.client.email, password: fixtures.password },
    });
    const auth = await login.json();
    const refresh = await request.post(`${apiUrl}/users/token/refresh/`, {
      data: { refresh: auth.refresh },
    });
    expect(refresh.ok()).toBeTruthy();
    const data = await refresh.json();
    expect(data.access).toBeTruthy();
  });

  test('unauthenticated me request is rejected', async ({ request }) => {
    const response = await request.get(`${apiUrl}/users/me/`);
    expect(response.status()).toBe(401);
  });
});
