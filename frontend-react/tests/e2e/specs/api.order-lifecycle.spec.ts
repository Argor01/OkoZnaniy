import { expect, test } from '@playwright/test';
import { authHeaders, isoDateDaysFromNow, loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();
const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000';
const apiUrl = `${apiBase}/api`;

async function createClientOrder(request: Parameters<typeof test>[0] extends never ? never : any, title: string) {
  const response = await request.post(`${apiUrl}/orders/orders/`, {
    headers: authHeaders(fixtures.auth.client.access),
    data: {
      title,
      description: `Lifecycle description for ${title}`,
      deadline: isoDateDaysFromNow(7),
      subject_id: fixtures.subject.id,
      work_type_id: fixtures.workType.id,
      custom_topic: `Topic ${title}`,
      budget: 6400,
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

test.describe('API order review lifecycle', () => {
  test('expert can take a client order, submit it for review, and client can approve it', async ({ request }) => {
    const order = await createClientOrder(request, `Lifecycle Approve ${Date.now()}`);

    const takeResponse = await request.post(`${apiUrl}/orders/orders/${order.id}/take/`, {
      headers: authHeaders(fixtures.auth.expert.access),
      data: {},
    });
    expect(takeResponse.status()).toBe(200);

    const submitResponse = await request.post(`${apiUrl}/orders/orders/${order.id}/submit/`, {
      headers: authHeaders(fixtures.auth.expert.access),
      data: {},
    });
    expect(submitResponse.status()).toBe(200);
    const reviewOrder = await submitResponse.json();
    expect(reviewOrder.status).toBe('review');

    const approveResponse = await request.post(`${apiUrl}/orders/orders/${order.id}/approve/`, {
      headers: authHeaders(fixtures.auth.client.access),
      data: {},
    });
    expect(approveResponse.status()).toBe(200);
    const completedOrder = await approveResponse.json();
    expect(completedOrder.status).toBe('completed');
  });

  test('client can return reviewed work to revision with a comment', async ({ request }) => {
    const order = await createClientOrder(request, `Lifecycle Revision ${Date.now()}`);

    const takeResponse = await request.post(`${apiUrl}/orders/orders/${order.id}/take/`, {
      headers: authHeaders(fixtures.auth.expert.access),
      data: {},
    });
    expect(takeResponse.status()).toBe(200);

    const submitResponse = await request.post(`${apiUrl}/orders/orders/${order.id}/submit/`, {
      headers: authHeaders(fixtures.auth.expert.access),
      data: {},
    });
    expect(submitResponse.status()).toBe(200);

    const revisionResponse = await request.post(`${apiUrl}/orders/orders/${order.id}/revision/`, {
      headers: authHeaders(fixtures.auth.client.access),
      data: { comment: 'Please revise chapter two.' },
    });
    expect(revisionResponse.status()).toBe(200);
    const revisedOrder = await revisionResponse.json();
    expect(revisedOrder.status).toBe('revision');
  });

  test('non-owner user cannot approve someone else review order', async ({ request }) => {
    const order = await createClientOrder(request, `Lifecycle Forbidden ${Date.now()}`);

    const takeResponse = await request.post(`${apiUrl}/orders/orders/${order.id}/take/`, {
      headers: authHeaders(fixtures.auth.expert.access),
      data: {},
    });
    expect(takeResponse.status()).toBe(200);

    const submitResponse = await request.post(`${apiUrl}/orders/orders/${order.id}/submit/`, {
      headers: authHeaders(fixtures.auth.expert.access),
      data: {},
    });
    expect(submitResponse.status()).toBe(200);

    const outsiderApprove = await request.post(`${apiUrl}/orders/orders/${order.id}/approve/`, {
      headers: authHeaders(fixtures.auth.partner.access),
      data: {},
    });
    expect(outsiderApprove.status()).toBe(404);
  });
});
