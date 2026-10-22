import { test, expect } from './fixtures';

// Guard against the e2e suite silently validating a foreign application that
// happens to occupy the same port (e.g. an unrelated dev server already running).
test('served app is ListingAI / NicheScout', async ({ page, baseURL }) => {
  const response = await page.goto('/');
  expect(response?.status(), `baseURL ${baseURL} must serve the ListingAI app`).toBe(200);
  await expect(page).toHaveTitle(/NicheScout/i);
  await expect(page.locator('text=NicheScout').first()).toBeVisible();
});
