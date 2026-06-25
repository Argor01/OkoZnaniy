import { expect, test } from '@playwright/test';
import { authHeaders, loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();
const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000';
const apiUrl = `${apiBase}/api`;

function items<T>(payload: T[] | { results?: T[] }) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

test.describe('API partner dialogs', () => {
  test('partner chat rooms list contains private dialog with seeded director', async ({ request }) => {
    const response = await request.get(`${apiUrl}/partners/chat-rooms/`, {
      headers: authHeaders(fixtures.auth.partner.access),
    });
    expect(response.ok()).toBeTruthy();
    const data = items(await response.json());
    expect(data.length).toBeGreaterThan(0);

    const directorDialog = data.find(
      (room: {
        type?: string;
        participants?: Array<{ id: number; role: string }>;
      }) =>
        room.type === 'private' &&
        Array.isArray(room.participants) &&
        room.participants.some((participant) => participant.id === fixtures.director.id && participant.role === 'director'),
    );

    expect(directorDialog).toBeTruthy();
  });

  test('partner can send a message to own director dialog and read it back', async ({ request }) => {
    const roomsResponse = await request.get(`${apiUrl}/partners/chat-rooms/`, {
      headers: authHeaders(fixtures.auth.partner.access),
    });
    expect(roomsResponse.ok()).toBeTruthy();
    const rooms = items(await roomsResponse.json());

    const directorDialog = rooms.find(
      (room: {
        id: number;
        type?: string;
        participants?: Array<{ id: number }>;
      }) =>
        room.type === 'private' &&
        Array.isArray(room.participants) &&
        room.participants.some((participant) => participant.id === fixtures.director.id),
    );

    expect(directorDialog).toBeTruthy();

    const marker = `Partner dialog message ${Date.now()}`;
    const sendResponse = await request.post(`${apiUrl}/partners/chat-rooms/${directorDialog.id}/send_message/`, {
      headers: authHeaders(fixtures.auth.partner.access),
      data: { message: marker },
    });
    expect(sendResponse.status()).toBe(201);

    const messagesResponse = await request.get(`${apiUrl}/partners/chat-rooms/${directorDialog.id}/messages/`, {
      headers: authHeaders(fixtures.auth.partner.access),
    });
    expect(messagesResponse.ok()).toBeTruthy();
    const messages = await messagesResponse.json();
    expect(messages.some((message: { text: string }) => message.text === marker)).toBeTruthy();
  });

  test('non-partner user cannot see partner dialogs', async ({ request }) => {
    const response = await request.get(`${apiUrl}/partners/chat-rooms/`, {
      headers: authHeaders(fixtures.auth.client.access),
    });
    expect(response.ok()).toBeTruthy();
    const data = items(await response.json());
    expect(data).toEqual([]);
  });
});
