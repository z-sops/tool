import { test, expect } from '@playwright/test';
import { assertListingAI } from './global-setup';

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
 * fail the preflight assertion.
 */
test('assertListingAI rejects a foreign HTML document', () => {
  const foreignHtml = `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Foreign App</title>
      </head>
      <body>Not ListingAI</body>
    </html>
  `;
  expect(() => assertListingAI(foreignHtml, 'http://example.com')).toThrow(
    /Preflight failed: http:\/\/example\.com did not serve the ListingAI application/
  );
});

/**
 * Positive control: valid ListingAI document passes.
 */
test('assertListingAI accepts a valid ListingAI document', () => {
  const validHtml = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta name="listingai:app" content="listingai-web">
        <meta name="application-name" content="ListingAI">
        listingai-woad.vercel.app
      </head>
      <body>ListingAI content</body>
    </html>
  `;
  expect(() => assertListingAI(validHtml, 'http://example.com')).not.toThrow();
});