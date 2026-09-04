import { expect, test } from '@playwright/test';
import { credentialsFrom, expectNoHorizontalOverflow, open, signIn } from './helpers';

/**
 * Проверки, требующие входа. Учётки задаются переменными окружения, иначе
 * тесты пропускаются — паролей в репозитории нет.
 *
 * Набор ничего не создаёт и не меняет: только открывает страницы и читает
 * данные, поэтому его безопасно гонять по боевому окружению.
 */

const expertCreds = credentialsFrom('SMOKE_EXPERT_LOGIN', 'SMOKE_EXPERT_PASSWORD');
const clientCreds = credentialsFrom('SMOKE_CLIENT_LOGIN', 'SMOKE_CLIENT_PASSWORD');

test.describe('Кабинет эксперта', () => {
  test.skip(!expertCreds, 'нет SMOKE_EXPERT_LOGIN / SMOKE_EXPERT_PASSWORD');

  test('вход выполняется и открывается лента заказов', async ({ page }) => {
    await signIn(page, expertCreds!);
    await open(page, '/orders-feed');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('лента заказов не прокручивается вбок', async ({ page }) => {
    await signIn(page, expertCreds!);
    await open(page, '/orders-feed');
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalOverflow(page);
  });

  test('на мобильном разделы доступны из сайдбара, а не иконками в хедере', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'только мобильный проект');

    await signIn(page, expertCreds!);
    await open(page, '/orders-feed');
    await page.waitForLoadState('networkidle');

    // Регрессия: в мобильном хедере был ряд иконок-навигации, который читали
    // как непонятные квадратики. Разделы должны жить в сайдбаре.
    await expect(page.locator('[class*="mobileNavIcon"]')).toHaveCount(0);

    await page.locator('header button').first().click();
    await expect(page.getByText('Лента заказов').first()).toBeVisible();
  });
});

test.describe('Магазин готовых работ', () => {
  test.skip(!clientCreds, 'нет SMOKE_CLIENT_LOGIN / SMOKE_CLIENT_PASSWORD');

  test('API магазина никогда не отдаёт прямую ссылку на файл работы', async ({ page }) => {
    await signIn(page, clientCreds!);

    // Регрессия: карточка работы отдавала поле file с прямой ссылкой на
    // /media/, и работу можно было скачать не заплатив. Поля file не должно
    // быть ни у кого и никогда — скачивание идёт только через эндпоинт с
    // проверкой оплаты.
    const listResponse = await page.request.get('/api/shop/works/');
    expect(listResponse.ok(), 'список работ должен отдаваться').toBeTruthy();

    const listBody = await listResponse.json();
    const works = Array.isArray(listBody) ? listBody : (listBody.results ?? []);
    test.skip(works.length === 0, 'в магазине нет работ');

    for (const work of works.slice(0, 5)) {
      const detail = await (await page.request.get(`/api/shop/works/${work.id}/`)).json();
      for (const file of detail.files ?? []) {
        expect(
          file,
          `работа #${work.id}: файл ${file.name} отдан с прямой ссылкой`,
        ).not.toHaveProperty('file');
      }
    }
  });

  test('страница магазина открывается и не едет вбок', async ({ page }) => {
    await signIn(page, clientCreds!);
    await open(page, '/shop/ready-works');
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalOverflow(page);
  });
});
