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

    const goto = (async (url: string, options?: Parameters<Page['goto']>[1]) => {
      const response = await originalGoto(url, options);
      const contentType = response?.headers()['content-type'] ?? '';
      if (contentType.includes('text/html')) {
        await page.waitForFunction(
          () => {
            const root = document.querySelector('#root');
            return !!root && root.childElementCount > 0;
          },
          undefined,
          { timeout: 30_000 },
        );
      }
      return response;
    }) as Page['goto'];

    page.goto = goto;
    await use(page);
  },
});

export { expect };
