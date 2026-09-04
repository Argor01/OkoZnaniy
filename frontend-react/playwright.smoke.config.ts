import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke-набор для УЖЕ РАЗВЁРНУТОГО окружения.
 *
 * Отличается от основного e2e (playwright.config.ts) тем, что не поднимает
 * свой стенд и ничего не создаёт в базе: только заходит на страницы и
 * проверяет инварианты интерфейса. Поэтому его безопасно гонять по бою
 * сразу после деплоя.
 *
 *   SMOKE_BASE_URL=https://okoznaniy.ru npm run test:smoke
 *
 * Проверки, требующие входа, включаются переменными окружения
 * (SMOKE_CLIENT_LOGIN/PASSWORD, SMOKE_EXPERT_LOGIN/PASSWORD) и без них
 * пропускаются — секретов в репозитории нет.
 */
const BASE_URL = process.env.SMOKE_BASE_URL ?? 'https://okoznaniy.ru';

export default defineConfig({
  testDir: './tests/e2e/smoke',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
