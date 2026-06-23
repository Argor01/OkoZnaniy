import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_PORT = Number(process.env.PLAYWRIGHT_FRONTEND_PORT ?? 5173);
const BACKEND_PORT = Number(process.env.PLAYWRIGHT_BACKEND_PORT ?? 8000);
const FRONTEND_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${FRONTEND_PORT}`;
const BACKEND_URL = process.env.PLAYWRIGHT_API_URL ?? `http://127.0.0.1:${BACKEND_PORT}`;

export default defineConfig({
  testDir: './tests/e2e/specs',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 960 },
  },
  globalSetup: path.resolve(__dirname, 'tests/e2e/global.setup.ts'),
  globalTeardown: path.resolve(__dirname, 'tests/e2e/global.teardown.ts'),
  webServer: [
    {
      command: 'python manage.py migrate && python manage.py runserver 127.0.0.1:8000',
      cwd: path.resolve(__dirname, '..'),
      url: `${BACKEND_URL}/api/users/me/`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${FRONTEND_PORT}`,
      cwd: __dirname,
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
