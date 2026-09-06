import { expect, test } from '@playwright/test';
import { authHeaders, isoDateDaysFromNow, loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();
const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000';
const apiUrl = `${apiBase}/api`;

/**
 * Ставки: комиссия внутри цены для клиента и редактирование своей ставки.
 *
 * Клиент не должен видеть «чистую» сумму эксперта — иначе при оплате
 * списывается больше, чем он видел. Эксперт при этом видит свою.
 */
async function createClientOrder(request: any, title: string) {
  const response = await request.post(`${apiUrl}/orders/orders/`, {
    headers: authHeaders(fixtures.auth.client.access),
    data: {
      title,
      description: `Bid description for ${title}`,
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

async function placeBid(request: any, orderId: number, amount: number) {
  const response = await request.post(`${apiUrl}/orders/orders/${orderId}/bids/`, {
    headers: authHeaders(fixtures.auth.expert.access),
    data: { amount, prepayment_percent: 50, comment: 'Готов взяться' },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

test.describe('API bids: commission and editing', () => {
  test('bid response exposes the client-facing amount with the service fee', async ({ request }) => {
    const order = await createClientOrder(request, `Bid Commission ${Date.now()}`);
    const bid = await placeBid(request, order.id, 1000);

    expect(Number(bid.amount)).toBe(1000);
    expect(Number(bid.client_amount)).toBe(1250);
  });

  test('expert can edit own active bid and the client amount follows', async ({ request }) => {
    const order = await createClientOrder(request, `Bid Edit ${Date.now()}`);
    const bid = await placeBid(request, order.id, 1000);

    const patchResponse = await request.patch(
      `${apiUrl}/orders/orders/${order.id}/bids/${bid.id}/`,
      {
        headers: authHeaders(fixtures.auth.expert.access),
        data: { amount: 2000, prepayment_percent: 25 },
      },
    );
    expect(patchResponse.status()).toBe(200);

    const updated = await patchResponse.json();
    expect(Number(updated.amount)).toBe(2000);
    expect(Number(updated.client_amount)).toBe(2500);
    expect(updated.prepayment_percent).toBe(25);
  });

  test('client sees the bid with the fee included and cannot edit it', async ({ request }) => {
    const order = await createClientOrder(request, `Bid Client View ${Date.now()}`);
    const bid = await placeBid(request, order.id, 1000);

    const listResponse = await request.get(`${apiUrl}/orders/orders/${order.id}/bids/`, {
      headers: authHeaders(fixtures.auth.client.access),
    });
    expect(listResponse.status()).toBe(200);
    const payload = await listResponse.json();
    const rows = Array.isArray(payload) ? payload : (payload.results ?? []);
    const row = rows.find((item: any) => item.id === bid.id);
    expect(row, 'клиент должен видеть отклик на свой заказ').toBeTruthy();
    expect(Number(row.client_amount)).toBe(1250);

    const patchResponse = await request.patch(
      `${apiUrl}/orders/orders/${order.id}/bids/${bid.id}/`,
      {
        headers: authHeaders(fixtures.auth.client.access),
        data: { amount: 1 },
      },
    );
    expect(patchResponse.status()).toBe(403);
  });

  test('bid cannot be edited once the order is taken', async ({ request }) => {
    const order = await createClientOrder(request, `Bid Locked ${Date.now()}`);
    const bid = await placeBid(request, order.id, 1000);

    const takeResponse = await request.post(`${apiUrl}/orders/orders/${order.id}/take/`, {
      headers: authHeaders(fixtures.auth.expert.access),
      data: {},
    });
    expect(takeResponse.status()).toBe(200);

    const patchResponse = await request.patch(
      `${apiUrl}/orders/orders/${order.id}/bids/${bid.id}/`,
      {
        headers: authHeaders(fixtures.auth.expert.access),
        data: { amount: 5000 },
      },
    );
    expect(patchResponse.status()).toBe(403);
  });
});
