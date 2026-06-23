import { expect, test } from '@playwright/test';
import { authHeaders, loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();
const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000';
const apiUrl = `${apiBase}/api`;

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
    const runId = Date.now();
    const requestedName = `Catalog Category ${runId}`;
    const response = await request.post(`${apiUrl}/catalog/categories/`, {
      headers: authHeaders(fixtures.auth.client.access),
      data: { name: requestedName, description: 'Created in Playwright', order: 10 },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(String(data.name).toLowerCase()).toContain(requestedName.toLowerCase());
  });

  test('client can create a subject', async ({ request }) => {
    const runId = Date.now();
    const requestedName = `Catalog Subject ${runId}`;
    const response = await request.post(`${apiUrl}/catalog/subjects/`, {
      headers: authHeaders(fixtures.auth.client.access),
      data: {
        name: requestedName,
        description: 'Created in Playwright',
        category: fixtures.category.id,
        min_price: 2500,
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(String(data.name).toLowerCase()).toContain(requestedName.toLowerCase());
  });

  test('client can create a work type', async ({ request }) => {
    const runId = Date.now();
    const requestedName = `Catalog Work Type ${runId}`;
    const response = await request.post(`${apiUrl}/catalog/work-types/`, {
      headers: authHeaders(fixtures.auth.client.access),
      data: {
        name: requestedName,
        description: 'Created in Playwright',
        base_price: 3100,
        estimated_time: 36,
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(String(data.name).toLowerCase()).toContain(requestedName.toLowerCase());
  });

  test('subject search returns seeded subject', async ({ request }) => {
    const response = await request.get(`${apiUrl}/catalog/subjects/`, {
      params: { search: fixtures.subject.name.split(' ')[0] },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.some((item: { name: string }) => item.name === fixtures.subject.name)).toBeTruthy();
  });

  test('work type search returns seeded work type', async ({ request }) => {
    const response = await request.get(`${apiUrl}/catalog/work-types/`, {
      params: { search: fixtures.workType.name.split(' ')[0] },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.some((item: { name: string }) => item.name === fixtures.workType.name)).toBeTruthy();
  });
});
