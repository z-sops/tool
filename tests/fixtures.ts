import { test as base, expect, type Page } from '@playwright/test';

/**
 * Shared test fixtures.
 *
 * ListingAI is a single-page application. `page.goto` resolves on the
 * document's load event, which happens before React has mounted and rendered
 * the route. A test that interacts with the page immediately after navigating
 * therefore races the render, and under parallel load the race can lose: the
 * element is not in the DOM yet, so `page.click` waits, and the test can reach
 * its timeout.
 *
 * This fixture wraps `page.goto` so that, for HTML responses, it returns only
 * once the application has actually rendered into #root. That removes the race
 * at its source instead of relying on a larger timeout.
 *
 * Non-HTML responses (robots.txt, sitemap.xml) are returned unchanged, because
 * they are not the application document and have no #root.
 */
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page);
    // Console and page errors are captured so a render failure can be
    // diagnosed instead of only reported as a timeout.
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

    const goto = (async (url: string, options?: Parameters<Page['goto']>[1]) => {
      const response = await originalGoto(url, options);
      const contentType = response?.headers()['content-type'] ?? '';
      if (contentType.includes('text/html')) {
        try {
          await page.waitForFunction(
            () => {
              const root = document.querySelector('#root');
              return !!root && root.childElementCount > 0;
            },
            undefined,
            // Poll on a timer rather than requestAnimationFrame: a background
            // tab can have its animation frames throttled, which would starve
            // a rAF-based wait.
            { timeout: 30_000, polling: 250 },
          );
        } catch (error) {
          const state = await page
            .evaluate(() => {
              const root = document.querySelector('#root');
              return {
                readyState: document.readyState,
                url: location.href,
                hasRoot: !!root,
                rootChildren: root ? root.childElementCount : -1,
                rootHtmlLength: root ? root.innerHTML.length : -1,
                scripts: Array.from(document.scripts).map((s) => s.src || 'inline').slice(0, 8),
              };
            })
            .catch(() => null);
          throw new Error(
            `The application did not render after navigating to ${url}. State: ${JSON.stringify(state)}. ` +
              `Console errors: ${JSON.stringify(consoleErrors.slice(0, 5))}. Cause: ${
                error instanceof Error ? error.message : String(error)
              }`,
          );
        }
      }
      return response;
    }) as Page['goto'];

    page.goto = goto;
    await use(page);
  },
});

export { expect };
