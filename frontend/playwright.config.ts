import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: Boolean(process.env.CI),
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${process.env.APP_PORT ?? '8080'}`,
    trace: 'retain-on-failure',
  },
});
