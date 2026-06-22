import { expect, test } from '@playwright/test';
import { loadFixtureData } from '../helpers/fixtureData';

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
    const auth = await login(request, 'client');
    const title = `Knowledge Question ${Date.now()}`;
    const response = await request.post(`${apiUrl}/knowledge/questions/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
      data: {
        title,
        description: 'Подробное описание вопроса для API-покрытия Playwright.',
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
    const clientAuth = await login(request, 'client');
    const questionTitle = `Answer Target ${Date.now()}`;
    const createdQuestion = await request.post(`${apiUrl}/knowledge/questions/`, {
      headers: { Authorization: `Bearer ${clientAuth.access}` },
      data: {
        title: questionTitle,
        description: 'Вопрос для проверки ответа эксперта.',
        category: fixtures.category.name,
        tags: ['react'],
      },
    });
    const question = await createdQuestion.json();

    const expertAuth = await login(request, 'expert');
    const response = await request.post(`${apiUrl}/knowledge/questions/${question.id}/add_answer/`, {
      headers: { Authorization: `Bearer ${expertAuth.access}` },
      data: { content: 'Экспертный ответ из API-теста.' },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.content).toContain('Экспертный ответ');
  });

  test('client cannot add an answer', async ({ request }) => {
    const auth = await login(request, 'client');
    const response = await request.post(`${apiUrl}/knowledge/questions/${fixtures.openQuestion.id}/add_answer/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
      data: { content: 'Клиент не должен отвечать' },
    });
    expect(response.status()).toBe(403);
  });

  test('client can like an expert answer', async ({ request }) => {
    const auth = await login(request, 'client');
    const response = await request.post(`${apiUrl}/knowledge/answers/${fixtures.answeredQuestion.answerId}/toggle_like/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(typeof data.likes_count).toBe('number');
  });

  test('client can create and delete own article', async ({ request }) => {
    const auth = await login(request, 'client');
    const create = await request.post(`${apiUrl}/knowledge/articles/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
      multipart: {
        title: `API Article ${Date.now()}`,
        description: 'Статья для проверки удаления.',
        work_type: fixtures.workType.name,
        subject: fixtures.subject.name,
      },
    });
    expect(create.ok()).toBeTruthy();
    const article = await create.json();

    const remove = await request.delete(`${apiUrl}/knowledge/articles/${article.id}/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
    });
    expect([200, 204]).toContain(remove.status());
  });
});
