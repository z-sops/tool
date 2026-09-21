import { test, expect } from '@playwright/test';

test.describe('ExplorePage', () => {
  test('loads with products and search', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.locator('text=Discover Profitable Products')).toBeVisible();
    await expect(page.locator('input[placeholder="Search products..."]')).toBeVisible();
  });

  test('category filtering works', async ({ page }) => {
    await page.goto('/explore');
    await page.click('button:has-text("Sports & Outdoors")');
    const products = page.locator('[class*="rounded-xl"][class*="border"]');
    const count = await products.count();
    expect(count).toBeGreaterThan(0);
  });

  test('search filters products', async ({ page }) => {
    await page.goto('/explore');
    await page.fill('input[placeholder="Search products..."]', 'Yoga');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Yoga Mat Towel')).toBeVisible();
  });

  test('product cards show price and rating', async ({ page }) => {
    await page.goto('/explore');
    await expect(page.locator('text=$24.99').first()).toBeVisible();
    await expect(page.locator('text=★ 4.5').first()).toBeVisible();
  });

  test('analyze niche link works', async ({ page }) => {
    await page.goto('/explore');
    const analyzeLink = page.locator('text=Analyze Niche').first();
    await analyzeLink.click();
    await expect(page).toHaveURL(/\/tools\/niche-analysis/);
  });

  test('calculate profit link works', async ({ page }) => {
    await page.goto('/explore');
    const calcLink = page.locator('text=Calculate Profit').first();
    await calcLink.click();
    await expect(page).toHaveURL(/\/tools\/amazon-profit-calculator/);
  });
});

test.describe('ComparePage', () => {
  test('loads with product selection', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.locator('text=Compare Products').first()).toBeVisible();
  });

  test('selecting products shows comparison table', async ({ page }) => {
    await page.goto('/compare');
    await page.click('button:has-text("Silicone Baking Mats")');
    await page.click('button:has-text("Resistance Bands Set")');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Silicone Baking Mats")')).toBeVisible();
  });

  test('comparison table shows metrics', async ({ page }) => {
    await page.goto('/compare');
    await page.click('button:has-text("Silicone Baking Mats")');
    await page.click('button:has-text("Resistance Bands Set")');
    await expect(page.locator('td:has-text("Price")')).toBeVisible();
    await expect(page.locator('td:has-text("Rating")')).toBeVisible();
    await expect(page.locator('td:has-text("Profit Margin")')).toBeVisible();
  });
});

test.describe('LearnPage', () => {
  test('loads with guides', async ({ page }) => {
    await page.goto('/learn');
    await expect(page.locator('text=E-commerce Research Guides')).toBeVisible();
    await expect(page.locator('text=Product Research 101')).toBeVisible();
  });

  test('guides have connected tools', async ({ page }) => {
    await page.goto('/learn');
    // Guides are collapsed by default — expand the first one
    const firstGuide = page.locator('text=Product Research 101').first();
    await firstGuide.click();
    await expect(page.locator('text=Connected Tools').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('CreatePage', () => {
  test('loads with form inputs', async ({ page }) => {
    await page.goto('/create');
    await expect(page.locator('text=Create Product Listing')).toBeVisible();
    await expect(page.locator('input[placeholder*="Stainless Steel"]')).toBeVisible();
  });

  test('platform selection works', async ({ page }) => {
    await page.goto('/create');
    await page.click('button:has-text("Etsy")');
    await expect(page.locator('button:has-text("Etsy")')).toHaveClass(/border-orange-500/);
  });

  test('tone selection works', async ({ page }) => {
    await page.goto('/create');
    await page.click('button:has-text("Friendly")');
    await expect(page.locator('button:has-text("Friendly")')).toHaveClass(/border-orange-500/);
  });

  test('generate button is disabled without product name', async ({ page }) => {
    await page.goto('/create');
    const btn = page.locator('button:has-text("Generate Listing")');
    await expect(btn).toBeDisabled();
  });

  test('generate button enables with product name', async ({ page }) => {
    await page.goto('/create');
    await page.fill('input[placeholder*="Stainless Steel"]', 'Test Product');
    const btn = page.locator('button:has-text("Generate Listing")');
    await expect(btn).toBeEnabled();
  });
});

test.describe('MyResearchPage', () => {
  test('loads with empty state', async ({ page }) => {
    await page.goto('/my-research');
    await expect(page.getByRole('heading', { name: 'My Research' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Saved Products' })).toBeVisible();
  });

  test('tabs are clickable', async ({ page }) => {
    await page.goto('/my-research');
    await page.click('button:has-text("Comparisons")');
    await page.click('button:has-text("Analyses")');
    await page.click('button:has-text("Listings")');
    await page.click('button:has-text("Notes")');
  });
});
