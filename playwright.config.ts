import { defineConfig } from '@playwright/test';

const testPort = process.env.LISTINGAI_TEST_PORT || '5181';
const testHost = process.env.LISTINGAI_TEST_HOST || '127.0.0.1';
const previewUrl = `http://${testHost}:${testPort}`;

export default defineConfig({
  testDir: './tests',
  // Only e2e specs here — unit tests (tests/unit/*.test.ts) run via vitest.
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${process.env.LISTINGAI_TEST_PORT || '5181'}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run build && npx vite preview --strictPort --host 127.0.0.1 --port ${process.env.LISTINGAI_TEST_PORT || '5181'}`,
    url: `http://127.0.0.1:${process.env.LISTINGAI_TEST_PORT || '5181'}`,
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...{ viewport: { width: 1280, height: 720 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } },
    },
    {
      name: 'mobile-chrome',
      use: { ...{ viewport: { width: 375, height: 812 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' } },
    },
  ],
});
