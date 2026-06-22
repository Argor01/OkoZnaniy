import { expect, test } from '@playwright/test';
import { clientStorageState, isoDateDaysFromNow, loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();

test.use({ storageState: clientStorageState });

test.describe('Client browser flows', () => {
  test('my works page renders filters', async ({ page }) => {
    await page.goto('/works');
    await expect(page.getByText('Мои заказы')).toBeVisible();
    await expect(page.getByPlaceholder('Поиск по названию или описанию...')).toBeVisible();
    await expect(page.getByPlaceholder('Номер заказа')).toBeVisible();
    await expect(page.getByPlaceholder('Предмет')).toBeVisible();
    await expect(page.getByPlaceholder('Тип работы')).toBeVisible();
  });

  test('my works search finds seeded order', async ({ page }) => {
    await page.goto('/works');
    await page.getByPlaceholder('Поиск по названию или описанию...').fill(fixtures.orders[0].title);
    await expect(page.getByText(fixtures.orders[0].title)).toBeVisible();
  });

  test('create order page renders all key fields', async ({ page }) => {
    await page.goto('/create-order');
    await expect(page.getByText('Создать заказ')).toBeVisible();
    await expect(page.getByPlaceholder('Введите название работы')).toBeVisible();
    await expect(page.getByPlaceholder('Тип работы')).toBeVisible();
    await expect(page.getByPlaceholder('Предмет')).toBeVisible();
    await expect(page.getByPlaceholder('Дата сдачи')).toBeVisible();
    await expect(page.getByPlaceholder('Введите описание работы')).toBeVisible();
  });

  test('client can create order via UI', async ({ page }) => {
    const title = `UI Client Order ${Date.now()}`;
    await page.goto('/create-order');
    await page.getByPlaceholder('Введите название работы').fill(title);
    await page.getByPlaceholder('Тип работы').click();
    await page.getByText(fixtures.workType.name, { exact: true }).first().click();
    await page.getByPlaceholder('Предмет').click();
    await page.getByText(fixtures.subject.name, { exact: true }).first().click();
    await page.getByPlaceholder('Дата сдачи').fill(isoDateDaysFromNow(8).slice(0, 10).split('-').reverse().join('.'));
    await page.getByPlaceholder('Введите описание работы').fill('Заказ создан из браузерного сценария Playwright.');
    await page.getByPlaceholder('Стоимость (необязательно)').fill('6500');
    await page.getByRole('button', { name: 'Создать заказ' }).last().click();
    await expect(page).toHaveURL(/\/orders\//);
    await expect(page.getByText(title)).toBeVisible();
  });

  test('newly created order is searchable in my works', async ({ page }) => {
    const title = `UI Searchable Order ${Date.now()}`;
    await page.goto('/create-order');
    await page.getByPlaceholder('Введите название работы').fill(title);
    await page.getByPlaceholder('Тип работы').click();
    await page.getByText(fixtures.workType.name, { exact: true }).first().click();
    await page.getByPlaceholder('Предмет').click();
    await page.getByText(fixtures.subject.name, { exact: true }).first().click();
    await page.getByPlaceholder('Дата сдачи').fill(isoDateDaysFromNow(9).slice(0, 10).split('-').reverse().join('.'));
    await page.getByPlaceholder('Введите описание работы').fill('Повторный заказ для сценария поиска.');
    await page.getByPlaceholder('Стоимость (необязательно)').fill('7200');
    await page.getByRole('button', { name: 'Создать заказ' }).last().click();
    await expect(page).toHaveURL(/\/orders\//);

    await page.goto('/works');
    await page.getByPlaceholder('Поиск по названию или описанию...').fill(title);
    await expect(page.getByText(title)).toBeVisible();
  });

  test('knowledge base shows seeded article', async ({ page }) => {
    await page.goto('/knowledge-base');
    await expect(page.getByText('База Знаний')).toBeVisible();
    await expect(page.getByText(fixtures.article.title)).toBeVisible();
  });

  test('knowledge base search finds seeded article', async ({ page }) => {
    await page.goto('/knowledge-base');
    await page.getByPlaceholder('Поиск по статьям...').fill(fixtures.article.title);
    await expect(page.getByText(fixtures.article.title)).toBeVisible();
  });

  test('knowledge portal shows seeded question', async ({ page }) => {
    await page.goto('/knowledge');
    await expect(page.getByText('Око Ответы')).toBeVisible();
    await expect(page.getByText(fixtures.answeredQuestion.title)).toBeVisible();
  });

  test('client can create a question via modal', async ({ page }) => {
    const title = `UI Client Question ${Date.now()}`;
    await page.goto('/knowledge');
    await page.getByRole('button', { name: 'Задать вопрос' }).click();
    await page.getByPlaceholder('Кратко опишите ваш вопрос').fill(title);
    await page.getByPlaceholder('Опишите ваш вопрос подробнее...').fill('Подробное описание нового вопроса в браузерном сценарии.');
    await page.getByPlaceholder('Выберите категорию').click();
    await page.getByText(fixtures.category.name, { exact: true }).click();
    await page.getByRole('button', { name: 'Опубликовать' }).click();
    await expect(page.getByText(title)).toBeVisible();
  });
});
