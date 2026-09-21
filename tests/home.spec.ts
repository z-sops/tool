import { test, expect } from '@playwright/test';

test.describe('HomePage', () => {
  test('loads and displays NicheScout branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NicheScout/);
    await expect(page.locator('text=NicheScout').first()).toBeVisible();
  });

  test('hero section with CTA buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Start Exploring' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create a Listing' })).toBeVisible();
  });

  test('navigation links are present', async ({ page }) => {
    const vp = page.viewportSize();
    if (!vp || vp.width < 768) { test.skip(); return; }
    await page.goto('/');
    await expect(page.locator('nav >> text=Explore')).toBeVisible();
    await expect(page.locator('nav >> text=Learn')).toBeVisible();
    await expect(page.locator('nav >> text=Create')).toBeVisible();
    await expect(page.locator('nav >> text=Compare')).toBeVisible();
    await expect(page.locator('nav >> text=My Research')).toBeVisible();
  });

  test('tools section shows all 11 tools', async ({ page }) => {
    await page.goto('/');
    const toolNames = [
      'Profit Calculator', 'ROI Calculator', 'Pricing Calculator',
      'IP Risk Check', 'Restriction Check', 'Sourcing Risk Check',
      'Listing Analyzer', 'Title Checker', 'Bullet Checker',
      'Niche Analysis', 'Research Checklist',
    ];
    for (const name of toolNames) {
      await expect(page.locator(`text=${name}`).first()).toBeVisible();
    }
  });

  test('hero CTA navigates to explore', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Start Exploring' }).click();
    await expect(page).toHaveURL(/\/explore/);
  });

  test('hero CTA navigates to create', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Create a Listing' }).click();
    await expect(page).toHaveURL(/\/create/);
  });
});

test.describe('Navigation', () => {
  test('header nav links work', async ({ page }) => {
    const vp = page.viewportSize();
    if (!vp || vp.width < 768) { test.skip(); return; }
    await page.goto('/');
    await page.click('nav >> text=Explore');
    await expect(page).toHaveURL(/\/explore/);

    await page.click('nav >> text=Learn');
    await expect(page).toHaveURL(/\/learn/);

    await page.click('nav >> text=Compare');
    await expect(page).toHaveURL(/\/compare/);

    await page.click('nav >> text=My Research');
    await expect(page).toHaveURL(/\/my-research/);
  });

  test('logo links to home', async ({ page }) => {
    await page.goto('/explore');
    await page.click('[aria-label="NicheScout Home"]');
    await expect(page).toHaveURL(/\/$/);
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.locator('text=404')).toBeVisible();
  });
});
