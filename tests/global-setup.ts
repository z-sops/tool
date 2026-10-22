import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import type { FullConfig } from '@playwright/test';

/**
 * Preflight for the ListingAI end-to-end suite.
 *
 * Two jobs, both of which run BEFORE the first test:
 *
 * 1. Application identity. The suite must only ever validate ListingAI. If the
 *    server that Playwright started is not ListingAI, the run aborts with a
 *    clear error instead of producing a wall of misleading failures.
 *
 * 2. Warm-up. On a cold start the Vite dev server transforms modules on
 *    demand. With several workers hitting the server at once, the first
 *    requests queue behind the transform of the whole module graph, and
 *    unrelated tests time out while waiting. Visiting every route once with a
 *    real browser forces that transformation up front, so the tests themselves
 *    run against a warm server. This addresses the cause of the flakiness
 *    rather than masking it with a larger timeout.
 */

/**
 * Markers that positively identify the ListingAI application.
 *
 * These are application-specific, not a generic document title:
 *  - `listingai:app` is a meta tag that only ListingAI emits.
 *  - `application-name: ListingAI` is ListingAI's own application name.
 *  - `listingai-woad.vercel.app` is ListingAI's canonical production origin.
 *
 * All three are present in the source document and in the built document, so
 * the guard works against the dev server and against the production bundle.
 *
 * The legacy "NicheScout" brand string is deliberately NOT part of the
 * required set: the brand alone does not identify the application, and other
 * applications may reuse it.
 */
const LISTINGAI_MARKERS = [
  'listingai:app',
  'application-name" content="ListingAI',
  'listingai-woad.vercel.app',
];

/** Applications that must never be validated by this suite. */
const FOREIGN_MARKERS = ['MRCGP', 'Snap to Fit', 'ZTech', 'ztech'];

export function assertListingAI(html: string, baseURL: string): void {
  const missing = LISTINGAI_MARKERS.filter((marker) => !html.includes(marker));
  if (missing.length) {
    throw new Error(
      `Preflight failed: ${baseURL} did not serve the ListingAI application ` +
        `(missing marker(s): ${missing.join(', ')}). Refusing to run the suite ` +
        `against an unknown server.`,
    );
  }
  const foreign = FOREIGN_MARKERS.filter((marker) => html.includes(marker));
  if (foreign.length) {
    throw new Error(
      `Preflight failed: ${baseURL} served a different application ` +
        `(matched: ${foreign.join(', ')}). Refusing to run the suite against it.`,
    );
  }
}

/** Reads every route the application defines, so the warm-up cannot drift. */
async function readAppRoutes(repoRoot: string): Promise<string[]> {
  const appSource = await readFile(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const routes = new Set<string>();
  for (const match of appSource.matchAll(/path="([^"]+)"/g)) {
    const route = match[1];
    if (route.startsWith('/')) routes.add(route);
  }
  // Routes the suite navigates to directly that are not App routes.
  routes.add('/nonexistent-page');
  return Array.from(routes);
}

/**
 * Finds the repository root. Playwright's `rootDir` is the test directory, so
 * the root is resolved by walking up until `src/App.tsx` is found.
 */
async function resolveRepoRoot(start: string): Promise<string> {
  let current = path.resolve(start);
  for (let i = 0; i < 6; i++) {
    try {
      await readFile(path.join(current, 'src', 'App.tsx'), 'utf8');
      return current;
    } catch {
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  throw new Error(`Preflight failed: could not locate src/App.tsx above ${start}.`);
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) {
    throw new Error('Preflight failed: no baseURL is configured for the e2e projects.');
  }

  const response = await fetch(baseURL);
  if (!response.ok) {
    throw new Error(`Preflight failed: ${baseURL} responded with HTTP ${response.status}.`);
  }
  const html = await response.text();
  assertListingAI(html, baseURL);
  console.log(`[e2e preflight] ListingAI identity verified at ${baseURL}`);

  // Warm the module graph so the first real test does not queue behind the
  // dev server's on-demand transformation.
  const repoRoot = await resolveRepoRoot(config.rootDir);
  const routes = await readAppRoutes(repoRoot);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const route of routes) {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'load' });
      // Wait until the application has actually rendered into #root.
      await page.waitForFunction(
        () => {
          const root = document.querySelector('#root');
          return !!root && root.childElementCount > 0;
        },
        undefined,
        { timeout: 30_000 },
      );
    }
    console.log(`[e2e preflight] warmed ${routes.length} routes on ${baseURL}`);
  } finally {
    await browser.close();
  }
}
