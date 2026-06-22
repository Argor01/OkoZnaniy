import { expect, test } from '@playwright/test';
import { loadFixtureData } from '../helpers/fixtureData';

const fixtures = loadFixtureData();

test.describe('Guest browser access', () => {
  test('login page renders auth actions', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Войти')).toBeVisible();
    await expect(page.getByText('Зарегистрироваться')).toBeVisible();
  });

  test('login tab shows email and password fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Войти').click();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Пароль')).toBeVisible();
  });

  test('guest is redirected from my works', async ({ page }) => {
    await page.goto('/works');
    await expect(page).toHaveURL(/\/login/);
  });

  test('guest is redirected from orders feed', async ({ page }) => {
    await page.goto('/orders-feed');
    await expect(page).toHaveURL(/\/login/);
  });

  test('guest is redirected from create order', async ({ page }) => {
    await page.goto('/create-order');
    await expect(page).toHaveURL(/\/login/);
  });

  test('guest is redirected from knowledge base', async ({ page }) => {
    await page.goto('/knowledge-base');
    await expect(page).toHaveURL(/\/login/);
  });

  test('guest is redirected from knowledge portal', async ({ page }) => {
    await page.goto('/knowledge');
    await expect(page).toHaveURL(/\/login/);
  });

  test('guest is redirected from order detail', async ({ page }) => {
    await page.goto(`/orders/${fixtures.orders[0].id}`);
    await expect(page).toHaveURL(/\/login/);
  });
});
