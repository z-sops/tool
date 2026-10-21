import { defineConfig } from '@playwright/test';

// Port isolation: this machine hosts several independent applications.
// ListingAI must never assume port 3000 (or any common dev port) is free and
// must never silently reuse a server belonging to another project.
//
// The port is resolved once by scripts/run-e2e.mjs and exported through
// LISTINGAI_TEST_PORT, because Playwright loads this file in the main process
// and in every worker process: a port probed at load time would resolve
// differently in each of them.
const PORT = Number(process.env.LISTINGAI_TEST_PORT || 5181);
const HOST = process.env.LISTINGAI_TEST_HOST || '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: './tests',
  // Only e2e specs here — unit tests (tests/unit/*.test.ts) run via vitest.
  testMatch: '**/*.spec.ts',
  // Runs after the web server has started and before the first test:
  // verifies that the server really serves ListingAI, then warms the dev
  // server's module graph so the tests do not queue behind a cold transform.
  globalSetup: './tests/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A shared host can fail a request at the OS level (for example
  // WSAENOBUFS / ERR_NO_BUFFER_SPACE when socket buffers cannot be allocated).
  // Such a failure is environmental and not reproducible, so one retry is
  // allowed. A genuine application defect is deterministic and still fails.
  // The list reporter prints "retry #1", so a flaky test stays visible.
  retries: Number(process.env.LISTINGAI_E2E_RETRIES ?? (process.env.CI ? 2 : 1)),
  // This machine runs several applications at once and has limited free
  // memory. The worker count is configurable so the suite can be tuned for a
  // constrained host; each worker holds its own browser process.
  workers: Number(process.env.LISTINGAI_E2E_WORKERS || 4),
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- --host ${HOST} --port ${PORT} --strictPort`,
    url: BASE_URL,
    // Never reuse an already-listening server: that validates a foreign app.
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      LISTINGAI_DEV_PORT: String(PORT),
      PORT: String(PORT),
    },
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
