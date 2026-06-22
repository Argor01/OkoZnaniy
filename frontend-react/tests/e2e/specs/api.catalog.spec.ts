import { expect, test } from '@playwright/test';
import { loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();
const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000';
const apiUrl = `${apiBase}/api`;

async function getClientToken(request: any) {
  const login = await request.post(`${apiUrl}/users/token/`, {
    data: { username: fixtures.client.email, password: fixtures.password },
  });
  const auth = await login.json();
  return auth.access as string;
}

test.describe('API catalog', () => {
  test('categories list contains seeded category', async ({ request }) => {
    const response = await request.get(`${apiUrl}/catalog/categories/`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.some((item: { name: string }) => item.name === fixtures.category.name)).toBeTruthy();
  });

  test('subjects list contains seeded subject', async ({ request }) => {
    const response = await request.get(`${apiUrl}/catalog/subjects/`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.some((item: { name: string }) => item.name === fixtures.subject.name)).toBeTruthy();
  });

  test('work types list contains seeded work type', async ({ request }) => {
    const response = await request.get(`${apiUrl}/catalog/work-types/`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.some((item: { name: string }) => item.name === fixtures.workType.name)).toBeTruthy();
  });

  test('client can create a category', async ({ request }) => {
    const token = await getClientToken(request);
    const runId = Date.now();
    const response = await request.post(`${apiUrl}/catalog/categories/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `Catalog Category ${runId}`, description: 'Created in Playwright', order: 10 },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.name).toContain(`Catalog Category ${runId}`);
  });

  test('client can create a subject', async ({ request }) => {
    const token = await getClientToken(request);
    const runId = Date.now();
    const response = await request.post(`${apiUrl}/catalog/subjects/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `Catalog Subject ${runId}`,
        description: 'Created in Playwright',
        category: fixtures.category.id,
        min_price: 2500,
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.name).toContain(`Catalog Subject ${runId}`);
  });

  test('client can create a work type', async ({ request }) => {
    const token = await getClientToken(request);
    const runId = Date.now();
    const response = await request.post(`${apiUrl}/catalog/work-types/`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `Catalog Work Type ${runId}`,
        description: 'Created in Playwright',
        base_price: 3100,
        estimated_time: 36,
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.name).toContain(`Catalog Work Type ${runId}`);
  });

  test('subject search returns seeded subject', async ({ request }) => {
    const response = await request.get(`${apiUrl}/catalog/subjects/`, {
      params: { search: fixtures.subject.name },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.some((item: { name: string }) => item.name === fixtures.subject.name)).toBeTruthy();
  });

  test('work type search returns seeded work type', async ({ request }) => {
    const response = await request.get(`${apiUrl}/catalog/work-types/`, {
      params: { search: fixtures.workType.name },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.some((item: { name: string }) => item.name === fixtures.workType.name)).toBeTruthy();
  });
});
