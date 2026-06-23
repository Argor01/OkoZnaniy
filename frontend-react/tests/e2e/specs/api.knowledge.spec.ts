import { expect, test } from '@playwright/test';
import { authHeaders, loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();
const apiBase = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8000';
const apiUrl = `${apiBase}/api`;

test.describe('API knowledge', () => {
  test('knowledge page categories include seeded category', async ({ request }) => {
    const response = await request.get(`${apiUrl}/catalog/categories/`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.some((item: { name: string }) => item.name === fixtures.category.name)).toBeTruthy();
  });

  test('questions list includes seeded answered question', async ({ request }) => {
    const response = await request.get(`${apiUrl}/knowledge/questions/`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.some((item: { title: string }) => item.title === fixtures.answeredQuestion.title)).toBeTruthy();
  });

  test('articles list includes seeded article', async ({ request }) => {
    const response = await request.get(`${apiUrl}/knowledge/articles/`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const items = data.results ?? data;
    expect(items.some((item: { title: string }) => item.title === fixtures.article.title)).toBeTruthy();
  });

  test('client can create a question', async ({ request }) => {
    const title = `Knowledge Question ${Date.now()}`;
    const response = await request.post(`${apiUrl}/knowledge/questions/`, {
      headers: authHeaders(fixtures.auth.client.access),
      data: {
        title,
        description: 'Detailed question created from Playwright API test.',
        category: fixtures.category.name,
        tags: ['docker'],
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.title).toBe(title);
  });

  test('question detail endpoint returns open question', async ({ request }) => {
    const response = await request.get(`${apiUrl}/knowledge/questions/${fixtures.openQuestion.id}/`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.title).toBe(fixtures.openQuestion.title);
  });

  test('expert can add an answer', async ({ request }) => {
    const response = await request.post(`${apiUrl}/knowledge/questions/${fixtures.openQuestion.id}/add_answer/`, {
      headers: authHeaders(fixtures.auth.expert.access),
      data: { content: 'Expert answer from Playwright API test.' },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.content).toContain('Expert answer');
  });

  test('client cannot add an answer', async ({ request }) => {
    const response = await request.post(`${apiUrl}/knowledge/questions/${fixtures.openQuestion.id}/add_answer/`, {
      headers: authHeaders(fixtures.auth.client.access),
      data: { content: 'Client should not answer here' },
    });
    expect(response.status()).toBe(403);
  });

  test('client can like an expert answer', async ({ request }) => {
    const response = await request.post(`${apiUrl}/knowledge/answers/${fixtures.answeredQuestion.answerId}/toggle_like/`, {
      headers: authHeaders(fixtures.auth.client.access),
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(typeof data.likes_count).toBe('number');
  });

  test('client can create and delete own article', async ({ request }) => {
    const create = await request.post(`${apiUrl}/knowledge/articles/`, {
      headers: authHeaders(fixtures.auth.client.access),
      multipart: {
        title: `API Article ${Date.now()}`,
        description: 'Article created for delete flow verification.',
        work_type: fixtures.workType.name,
        subject: fixtures.subject.name,
      },
    });
    expect(create.ok()).toBeTruthy();
    const article = await create.json();

    const remove = await request.delete(`${apiUrl}/knowledge/articles/${article.id}/`, {
      headers: authHeaders(fixtures.auth.client.access),
    });
    expect([200, 204]).toContain(remove.status());
  });
});
