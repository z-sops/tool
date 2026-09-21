import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation', () => {
  test('mobile menu opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const menuButton = page.locator('[aria-label="Open menu"]');
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.locator('[aria-label="Close menu"]')).toBeVisible();

    await page.locator('[aria-label="Close menu"]').click();
    await expect(page.locator('[aria-label="Open menu"]')).toBeVisible();
  });

  test('mobile nav links navigate', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.locator('[aria-label="Open menu"]').click();
    const mobileNav = page.locator('[aria-label="Mobile navigation"]');
    await mobileNav.locator('text=Explore').click();
    await expect(page).toHaveURL(/\/explore/);
  });
});

test.describe('Mobile Pages', () => {
  test('home page renders on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('text=NicheScout').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start Exploring' })).toBeVisible();
  });

  test('explore page renders on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/explore');
    await expect(page.locator('text=Discover Profitable Products')).toBeVisible();
  });

  test('tool pages render on mobile without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const toolPages = [
      '/tools/amazon-profit-calculator',
      '/tools/amazon-roi-calculator',
      '/tools/amazon-pricing-calculator',
      '/tools/amazon-ip-check',
      '/tools/amazon-restriction-check',
      '/tools/sourcing-risk-check',
      '/tools/amazon-listing-analyzer',
      '/tools/amazon-title-checker',
      '/tools/amazon-bullet-checker',
      '/tools/product-research-checklist',
      '/tools/niche-analysis',
    ];

    for (const url of toolPages) {
      await page.goto(url);
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(376);
    }
  });

  test('forms are usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/tools/amazon-profit-calculator');
    await page.fill('input[placeholder="24.99"]', '25');
    await page.fill('input[placeholder="5.00"]', '5');
    await page.click('button:has-text("Calculate Profit")');
    await expect(page.locator('text=$').first()).toBeVisible();
  });

  test('comparison works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/compare');
    await page.click('button:has-text("Silicone Baking Mats")');
    await page.click('button:has-text("Resistance Bands Set")');
    await expect(page.locator('table')).toBeVisible();
  });

  test('no horizontal overflow on any page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const pages = ['/', '/explore', '/learn', '/create', '/compare', '/my-research'];
    for (const url of pages) {
      await page.goto(url);
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(376);
    }
  });
});
