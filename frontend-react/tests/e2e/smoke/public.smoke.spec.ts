import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow } from './helpers';

/**
 * Публичная часть: доступность страниц и вёрстка без горизонтального скролла.
 *
 * Регрессия, которую закрывает последний тест: блок сравнения с ChatGPT имел
 * min-width 640px и на телефоне уезжал за экран.
 */
test.describe('Публичные страницы', () => {
  test('лендинг открывается и показывает главный экран', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status(), 'лендинг должен отвечать 200').toBeLessThan(400);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('страница входа отдаёт форму', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('Email').first()).toBeVisible();
    await expect(page.getByPlaceholder('Пароль').first()).toBeVisible();
  });

  for (const route of ['/orders-feed', '/works', '/create-order']) {
    test(`гостя не пускает в ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test('лендинг не прокручивается вбок', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalOverflow(page);
  });

  test('блок сравнения с ChatGPT помещается в экран', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const table = page.locator('[class*="vsTable"]:not([class*="Wrap"])').first();
    await table.scrollIntoViewIfNeeded();
    await expect(table).toBeVisible();

    const size = await table.evaluate((el) => {
      const wrap = el.parentElement as HTMLElement;
      return {
        table: el.getBoundingClientRect().width,
        wrap: wrap.getBoundingClientRect().width,
        minWidth: getComputedStyle(el).minWidth,
      };
    });

    expect(
      size.table,
      `таблица сравнения шире контейнера: ${size.table} > ${size.wrap} (min-width=${size.minWidth})`,
    ).toBeLessThanOrEqual(size.wrap + 1);
  });
});
