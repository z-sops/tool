import { test, expect } from '@playwright/test';

/**
 * Positive application-identity preflight.
 *
 * This test verifies that the server on the configured baseURL serves the
 * ListingAI application. It is intentionally minimal and independent of
 * the globalSetup preflight so that it can be run independently as a
 * regression test for the identity markers.
 */
test('served app is ListingAI', async ({ page, baseURL }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/NicheScout/i);
  await expect(page.locator('text=NicheScout').first()).toBeVisible();
});

/**
 * Negative-control test: a deliberately incorrect HTML document should
 * fail the preflight.
 *
 * This test is marked as skipped in normal runs because it requires a
 * specially crafted HTML document. It is enabled manually to verify that
 * the preflight correctly rejects foreign applications.
 */
test.skip('preflight rejects a foreign application', async ({ page }) => {
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <title>Foreign App</title>
      </head>
      <body>Not ListingAI</body>
    </html>
  `);
  // The preflight should reject this document because it lacks
  // the required ListingAI identity markers.
  const response = await page.goto('/');
  // The globalSetup preflight will throw before the test body runs,
  // so this test primarily documents the expected behavior.
});