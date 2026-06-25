import { expect, test } from '@playwright/test';
import { authHeaders, loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();
const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000';
const apiUrl = `${apiBase}/api`;

function items<T>(payload: T[] | { results?: T[] }) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

test.describe('API director chat rooms', () => {
  test('director can create a chat room and see it in the list', async ({ request }) => {
    const roomName = `Director API Room ${Date.now()}`;
    const createResponse = await request.post(`${apiUrl}/director/chat-rooms/`, {
      headers: authHeaders(fixtures.auth.director.access),
      data: {
        name: roomName,
        description: 'Created from Playwright API test.',
        room_type: 'general',
      },
    });

    expect(createResponse.status()).toBe(201);
    const createdRoom = await createResponse.json();
    expect(createdRoom.name).toBe(roomName);

    const listResponse = await request.get(`${apiUrl}/director/chat-rooms/`, {
      headers: authHeaders(fixtures.auth.director.access),
    });
    expect(listResponse.ok()).toBeTruthy();
    const rooms = items(await listResponse.json());
    expect(rooms.some((room: { id: number; name: string }) => room.id === createdRoom.id && room.name === roomName)).toBeTruthy();
  });

  test('director can send a message to own room and read it back', async ({ request }) => {
    const roomResponse = await request.post(`${apiUrl}/director/chat-rooms/`, {
      headers: authHeaders(fixtures.auth.director.access),
      data: {
        name: `Director Message Room ${Date.now()}`,
        description: 'Room for message API verification.',
        room_type: 'private',
      },
    });
    expect(roomResponse.status()).toBe(201);
    const room = await roomResponse.json();

    const marker = `Director message ${Date.now()}`;
    const sendResponse = await request.post(`${apiUrl}/director/chat-rooms/${room.id}/send_message/`, {
      headers: authHeaders(fixtures.auth.director.access),
      data: { message: marker },
    });
    expect(sendResponse.status()).toBe(201);

    const messagesResponse = await request.get(`${apiUrl}/director/chat-rooms/${room.id}/messages/`, {
      headers: authHeaders(fixtures.auth.director.access),
    });
    expect(messagesResponse.ok()).toBeTruthy();
    const messages = await messagesResponse.json();
    expect(messages.some((message: { text: string }) => message.text === marker)).toBeTruthy();
  });

  test('director can invite another seeded user to a room', async ({ request }) => {
    const roomResponse = await request.post(`${apiUrl}/director/chat-rooms/`, {
      headers: authHeaders(fixtures.auth.director.access),
      data: {
        name: `Director Invite Room ${Date.now()}`,
        description: 'Room for invite API verification.',
        room_type: 'general',
      },
    });
    expect(roomResponse.status()).toBe(201);
    const room = await roomResponse.json();

    const inviteResponse = await request.post(`${apiUrl}/director/chat-rooms/${room.id}/invite_user/`, {
      headers: authHeaders(fixtures.auth.director.access),
      data: { user_id: fixtures.partner.id },
    });
    expect(inviteResponse.status()).toBe(200);
  });

  test('non-director user cannot create a director room', async ({ request }) => {
    const response = await request.post(`${apiUrl}/director/chat-rooms/`, {
      headers: authHeaders(fixtures.auth.client.access),
      data: {
        name: `Forbidden Director Room ${Date.now()}`,
        description: 'Client should not be able to create this room.',
        room_type: 'general',
      },
    });

    expect(response.status()).toBe(403);
  });

  test('non-director user gets an empty director room list', async ({ request }) => {
    const response = await request.get(`${apiUrl}/director/chat-rooms/`, {
      headers: authHeaders(fixtures.auth.client.access),
    });

    expect(response.ok()).toBeTruthy();
    expect(items(await response.json())).toEqual([]);
  });
});
