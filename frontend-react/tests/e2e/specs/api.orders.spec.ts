import { expect, test } from '@playwright/test';
import { isoDateDaysFromNow, loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();
const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000';
const apiUrl = `${apiBase}/api`;

async function login(request: any, role: 'client' | 'expert') {
  const email = role === 'client' ? fixtures.client.email : fixtures.expert.email;
  const response = await request.post(`${apiUrl}/users/token/`, {
    data: { username: email, password: fixtures.password },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('API orders', () => {
  test('client orders endpoint returns seeded orders', async ({ request }) => {
    const auth = await login(request, 'client');
    const response = await request.get(`${apiUrl}/users/client_orders/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
    });
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    const items = payload.results ?? payload;
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  test('expert available orders endpoint returns seeded orders', async ({ request }) => {
    const auth = await login(request, 'expert');
    const response = await request.get(`${apiUrl}/orders/orders/available/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
    });
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    const items = payload.results ?? payload;
    expect(items.some((order: { title: string }) => order.title === fixtures.orders[0].title)).toBeTruthy();
  });

  test('client can create a valid order', async ({ request }) => {
    const auth = await login(request, 'client');
    const response = await request.post(`${apiUrl}/orders/orders/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
      data: {
        title: `API Create Order ${Date.now()}`,
        description: 'Создано в API тесте Playwright.',
        deadline: isoDateDaysFromNow(6),
        subject_id: fixtures.subject.id,
        work_type_id: fixtures.workType.id,
        custom_topic: 'API topic',
        budget: 4200,
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.subject.id).toBe(fixtures.subject.id);
    expect(data.work_type.id).toBe(fixtures.workType.id);
  });

  test('order creation requires subject', async ({ request }) => {
    const auth = await login(request, 'client');
    const response = await request.post(`${apiUrl}/orders/orders/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
      data: {
        title: 'Invalid order without subject',
        description: 'Missing subject',
        deadline: isoDateDaysFromNow(6),
        work_type_id: fixtures.workType.id,
        custom_topic: 'No subject',
        budget: 3000,
      },
    });
    expect(response.status()).toBe(400);
  });

  test('order creation requires work type', async ({ request }) => {
    const auth = await login(request, 'client');
    const response = await request.post(`${apiUrl}/orders/orders/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
      data: {
        title: 'Invalid order without work type',
        description: 'Missing work type',
        deadline: isoDateDaysFromNow(6),
        subject_id: fixtures.subject.id,
        custom_topic: 'No work type',
        budget: 3000,
      },
    });
    expect(response.status()).toBe(400);
  });

  test('order creation rejects past deadline', async ({ request }) => {
    const auth = await login(request, 'client');
    const response = await request.post(`${apiUrl}/orders/orders/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
      data: {
        title: 'Invalid past deadline',
        description: 'Past deadline',
        deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        subject_id: fixtures.subject.id,
        work_type_id: fixtures.workType.id,
        custom_topic: 'Past deadline',
        budget: 3000,
      },
    });
    expect(response.status()).toBe(400);
  });

  test('order creation rejects negative budget', async ({ request }) => {
    const auth = await login(request, 'client');
    const response = await request.post(`${apiUrl}/orders/orders/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
      data: {
        title: 'Invalid negative budget',
        description: 'Negative budget',
        deadline: isoDateDaysFromNow(6),
        subject_id: fixtures.subject.id,
        work_type_id: fixtures.workType.id,
        custom_topic: 'Negative budget',
        budget: -1,
      },
    });
    expect(response.status()).toBe(400);
  });

  test('client can retrieve seeded order detail', async ({ request }) => {
    const auth = await login(request, 'client');
    const response = await request.get(`${apiUrl}/orders/orders/${fixtures.orders[0].id}/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.title).toBe(fixtures.orders[0].title);
  });

  test('client can update own order title', async ({ request }) => {
    const auth = await login(request, 'client');
    const newTitle = `Updated Order ${Date.now()}`;
    const response = await request.patch(`${apiUrl}/orders/orders/${fixtures.orders[1].id}/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
      data: { title: newTitle },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.title).toBe(newTitle);
  });

  test('client can add a comment to order', async ({ request }) => {
    const auth = await login(request, 'client');
    const text = `Comment ${Date.now()}`;
    const response = await request.post(`${apiUrl}/orders/orders/${fixtures.orders[0].id}/comments/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
      data: { text },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.text).toBe(text);
  });

  test('order comments endpoint returns added comments', async ({ request }) => {
    const auth = await login(request, 'client');
    const marker = `Marker ${Date.now()}`;
    await request.post(`${apiUrl}/orders/orders/${fixtures.orders[0].id}/comments/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
      data: { text: marker },
    });
    const response = await request.get(`${apiUrl}/orders/orders/${fixtures.orders[0].id}/comments/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.some((item: { text: string }) => item.text === marker)).toBeTruthy();
  });

  test('expert can place a bid and fetch bids', async ({ request }) => {
    const auth = await login(request, 'expert');
    const comment = `Bid comment ${Date.now()}`;
    const createBid = await request.post(`${apiUrl}/orders/orders/${fixtures.orders[2].id}/bids/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
      data: { amount: 21000, prepayment_percent: 50, comment },
    });
    expect(createBid.ok()).toBeTruthy();

    const bids = await request.get(`${apiUrl}/orders/orders/${fixtures.orders[2].id}/bids/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
    });
    expect(bids.ok()).toBeTruthy();
    const data = await bids.json();
    const items = data.results ?? data;
    expect(items.some((item: { comment: string }) => item.comment === comment)).toBeTruthy();
  });
});
