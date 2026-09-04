import { expect, type Page } from '@playwright/test';

export interface SmokeCredentials {
  login: string;
  password: string;
}

/** Учётка берётся только из окружения — в репозитории паролей нет. */
export function credentialsFrom(loginVar: string, passwordVar: string): SmokeCredentials | null {
  const login = process.env[loginVar];
  const password = process.env[passwordVar];
  if (!login || !password) return null;
  return { login, password };
}

/**
 * Прячем плашку про метрику: она зафиксирована внизу и перехватывает клики.
 * Именно прячем, а не нажимаем «Хорошо» — соглашаться за пользователя тесту
 * незачем.
 */
export async function hideOverlays(page: Page): Promise<void> {
  await page
    .addStyleTag({ content: '[class*="cookieConsent"] { display: none !important; }' })
    .catch(() => undefined);
}

/**
 * Вход через форму.
 *
 * Две особенности страницы: она открывается на вкладке «Зарегистрироваться»,
 * а поле подписано как Email, хотя бэкенд ждёт username. Поэтому сначала
 * переключаем вкладку, а потом заполняем только видимые поля — в DOM висит
 * ещё и скрытая форма регистрации с такими же плейсхолдерами.
 */
export async function signIn(page: Page, { login, password }: SmokeCredentials): Promise<void> {
  await page.goto('/login');
  await hideOverlays(page);

  await page.getByRole('tab', { name: 'Войти', exact: true }).click();

  const email = page.locator('input[placeholder="Email"]:visible').first();
  await expect(email).toBeVisible();
  await email.fill(login);
  await page.locator('input[placeholder="Пароль"]:visible').first().fill(password);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();

  await expect(page, 'после входа не должно остаться на /login').not.toHaveURL(/\/login/, {
    timeout: 30_000,
  });
}

/** Открыть страницу и убрать перекрывающие элементы. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await hideOverlays(page);
}

/** Страница не должна прокручиваться вбок: это ловит «распирающие» блоки. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    overflow.scrollWidth,
    `страница шире экрана: scrollWidth=${overflow.scrollWidth}, viewport=${overflow.innerWidth}`,
  ).toBeLessThanOrEqual(overflow.innerWidth + 1);
}
