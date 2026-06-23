import { expect, test } from '@playwright/test';
import { authHeaders, loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();
const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000';
const apiUrl = `${apiBase}/api`;

test.describe('API auth', () => {
  test('client can fetch own profile', async ({ request }) => {
    const me = await request.get(`${apiUrl}/users/me/`, {
      headers: authHeaders(fixtures.auth.client.access),
    });
    expect(me.ok()).toBeTruthy();
    const data = await me.json();
    expect(data.email).toBe(fixtures.client.email);
    expect(data.role).toBe('client');
  });

  test('expert can fetch own profile', async ({ request }) => {
    const me = await request.get(`${apiUrl}/users/me/`, {
      headers: authHeaders(fixtures.auth.expert.access),
    });
    expect(me.ok()).toBeTruthy();
    const data = await me.json();
    expect(data.email).toBe(fixtures.expert.email);
    expect(data.role).toBe('expert');
  });

  test('partner can fetch own profile', async ({ request }) => {
    const me = await request.get(`${apiUrl}/users/me/`, {
      headers: authHeaders(fixtures.auth.partner.access),
    });
    expect(me.ok()).toBeTruthy();
    const data = await me.json();
    expect(data.email).toBe(fixtures.partner.email);
    expect(data.role).toBe('partner');
  });

  test('valid credentials return tokens', async ({ request }) => {
    const response = await request.post(`${apiUrl}/users/token/`, {
      data: { username: fixtures.client.email, password: fixtures.password },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.access).toBeTruthy();
    expect(data.refresh).toBeTruthy();
    expect(data.user.role).toBe('client');
  });

  test('invalid credentials are rejected', async ({ request }) => {
    const response = await request.post(`${apiUrl}/users/token/`, {
      data: { username: fixtures.client.email, password: 'wrong-password' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('refresh token returns a new access token', async ({ request }) => {
    const refresh = await request.post(`${apiUrl}/users/token/refresh/`, {
      data: { refresh: fixtures.auth.client.refresh },
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
