import { expect, test } from '@playwright/test';
import { expertStorageState, loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();

test.use({ storageState: expertStorageState });

test.describe('Expert browser flows', () => {
  test('orders feed renders seeded orders', async ({ page }) => {
    await page.goto('/orders-feed');
    await expect(page.getByText('Лента заказов')).toBeVisible();
    await expect(page.getByText(fixtures.orders[0].title)).toBeVisible();
  });

  test('orders feed search finds seeded order', async ({ page }) => {
    await page.goto('/orders-feed');
    await page.getByPlaceholder('Поиск по названию или описанию...').fill(fixtures.orders[1].title);
    await expect(page.getByText(fixtures.orders[1].title)).toBeVisible();
  });

  test('orders feed budget controls are visible', async ({ page }) => {
    await page.goto('/orders-feed');
    await expect(page.getByText('Бюджет')).toBeVisible();
    await expect(page.getByText('От')).toBeVisible();
    await expect(page.getByText('До')).toBeVisible();
  });

  test('knowledge portal shows open question for expert', async ({ page }) => {
    await page.goto('/knowledge');
    await expect(page.getByText(fixtures.openQuestion.title)).toBeVisible();
  });

  test('question detail shows expert answer form', async ({ page }) => {
    await page.goto(`/knowledge/${fixtures.openQuestion.id}`);
    await expect(page.getByText('Ваш ответ')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Отправить ответ' })).toBeVisible();
  });

  test('expert can answer an open question', async ({ page }) => {
    const answerText = `Expert browser answer ${Date.now()}`;
    await page.goto(`/knowledge/${fixtures.openQuestion.id}`);
    await page.getByPlaceholder('Напишите ваш ответ...').fill(answerText);
    await page.getByRole('button', { name: 'Отправить ответ' }).click();
    await expect(page.getByText(answerText)).toBeVisible();
  });

  test('knowledge base shows create article button for expert', async ({ page }) => {
    await page.goto('/knowledge-base');
    await expect(page.getByRole('button', { name: 'Написать статью' })).toBeVisible();
  });

  test('knowledge base still shows seeded article for expert', async ({ page }) => {
    await page.goto('/knowledge-base');
    await expect(page.getByText(fixtures.article.title)).toBeVisible();
  });
});
