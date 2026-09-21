import { test, expect } from '@playwright/test';

test.describe('Profit Calculator', () => {
  test('loads with inputs', async ({ page }) => {
    await page.goto('/tools/amazon-profit-calculator');
    await expect(page.getByRole('heading', { name: 'Amazon Profit Calculator' })).toBeVisible();
    await expect(page.locator('input[placeholder="24.99"]')).toBeVisible();
  });

  test('calculates profit correctly', async ({ page }) => {
    await page.goto('/tools/amazon-profit-calculator');
    await page.fill('input[placeholder="24.99"]', '30');
    await page.fill('input[placeholder="5.00"]', '5');
    await page.fill('input[placeholder="2.00"]', '3');
    await page.fill('input[placeholder="0.00"]', '1');
    await page.click('button:has-text("Calculate Profit")');

    await expect(page.locator('p:has-text("$16.50")').first()).toBeVisible();
    await expect(page.locator('text=55.0% margin')).toBeVisible();
  });

  test('shows negative profit for bad margins', async ({ page }) => {
    await page.goto('/tools/amazon-profit-calculator');
    await page.fill('input[placeholder="24.99"]', '10');
    await page.fill('input[placeholder="5.00"]', '8');
    await page.fill('input[placeholder="2.00"]', '3');
    await page.click('button:has-text("Calculate Profit")');

    await expect(page.locator('text=-2.50').first()).toBeVisible();
  });

  test('educational content is present', async ({ page }) => {
    await page.goto('/tools/amazon-profit-calculator');
    await expect(page.locator('text=How Amazon FBA Profit Calculation Works')).toBeVisible();
    await expect(page.locator('text=Related NicheScout tools')).toBeVisible();
  });
});

test.describe('ROI Calculator', () => {
  test('loads and calculates ROI', async ({ page }) => {
    await page.goto('/tools/amazon-roi-calculator');
    await expect(page.getByRole('heading', { name: 'ROI Calculator' })).toBeVisible();

    // Labels have no htmlFor/id so getByLabel won't work; use placeholders with nth()
    await page.locator('input[placeholder="2000"]').fill('2000');
    await page.locator('input[placeholder="500"]').nth(0).fill('500');
    await page.locator('input[placeholder="500"]').nth(1).fill('500');
    await page.click('button:has-text("Calculate ROI")');

    // Total investment: 2500, Monthly profit: 500
    // ROI: (500 * 12 / 2500) * 100 = 240%
    await expect(page.locator('text=240.0%').first()).toBeVisible();
  });

  test('payback period calculation', async ({ page }) => {
    await page.goto('/tools/amazon-roi-calculator');
    await page.locator('input[placeholder="2000"]').fill('1000');
    await page.locator('input[placeholder="500"]').nth(0).fill('200');
    await page.click('button:has-text("Calculate ROI")');

    // Payback: 1000 / 200 = 5.0 months
    await expect(page.locator('text=5.0').first()).toBeVisible();
  });
});

test.describe('Pricing Calculator', () => {
  test('loads and calculates price', async ({ page }) => {
    await page.goto('/tools/amazon-pricing-calculator');
    await expect(page.getByRole('heading', { name: 'Pricing Calculator' })).toBeVisible();

    await page.fill('input[placeholder="5.00"]', '5');
    await page.fill('input[placeholder="2.00"]', '2');
    await page.click('button:has-text("Calculate Price")');

    // Price = (5 + 2) / (1 - 0.3 - 0.15) = 7 / 0.55 = 12.7272...
    await expect(page.locator('text=$12.73').first()).toBeVisible();
  });
});

test.describe('IP Risk Check', () => {
  test('loads with disclaimer', async ({ page }) => {
    await page.goto('/tools/amazon-ip-check');
    await expect(page.getByRole('heading', { name: 'IP Risk Check', exact: true })).toBeVisible();
    await expect(page.locator('text=risk-screening research tool only')).toBeVisible();
  });

  test('seller integrity warning appears', async ({ page }) => {
    await page.goto('/tools/amazon-ip-check');
    await expect(page.locator('text=SELLER INTEGRITY WARNING')).toBeVisible();
    await expect(page.locator('text=Never use fake, counterfeit')).toBeVisible();
  });

  test('generic/private-label scenario — low risk', async ({ page }) => {
    await page.goto('/tools/amazon-ip-check');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Generic / White-label")');
    await page.click('button:has-text("Check IP Risk")');
    await expect(page.locator('text=Generic or white-label product')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('p.text-2xl.font-bold')).toContainText('No obvious');
  });

  test('branded authorized scenario — low risk', async ({ page }) => {
    await page.goto('/tools/amazon-ip-check');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder*="Nike"]', 'Nike');
    await page.click('button:has-text("Branded (Authorized)")');
    await page.click('button:has-text("Registered")');
    await page.locator('label:has-text("Supplier is verified")').click();
    await page.locator('label:has-text("Have supplier invoices")').click();
    await page.click('button:has-text("Check IP Risk")');
    await expect(page.locator('p.text-2xl.font-bold')).toContainText('No obvious');
  });

  test('branded unauthorized scenario — high risk', async ({ page }) => {
    await page.goto('/tools/amazon-ip-check');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder*="Nike"]', 'Nike');
    await page.click('button:has-text("Branded (No Authorization)")');
    await page.click('button:has-text("Check IP Risk")');
    await expect(page.locator('p.text-2xl.font-bold')).toContainText(/concern/i, { timeout: 10000 });
    await expect(page.locator('text=Selling branded product without confirmed authorization')).toBeVisible();
  });

  test('uses another brand — critical risk', async ({ page }) => {
    await page.goto('/tools/amazon-ip-check');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder*="Nike"]', 'Disney');
    await page.click('button:has-text("Uses Another Brand")');
    await page.click('button:has-text("Check IP Risk")');
    await expect(page.locator('p.text-2xl.font-bold')).toContainText(/concern/i, { timeout: 10000 });
  });

  test('copied content scenario — elevated risk', async ({ page }) => {
    await page.goto('/tools/amazon-ip-check');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Generic / White-label")');
    await page.locator('button:has-text("Copied")').first().click();
    await page.click('button:has-text("Check IP Risk")');
    await expect(page.locator('text=images copied from another seller')).toBeVisible({ timeout: 10000 });
  });

  test('result explanation appears', async ({ page }) => {
    await page.goto('/tools/amazon-ip-check');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Check IP Risk")');
    await expect(page.locator('text=Why This Result')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=What to Review')).toBeVisible();
    await expect(page.locator('text=Next Step')).toBeVisible();
  });

  test('no prohibited "IP safe" language', async ({ page }) => {
    await page.goto('/tools/amazon-ip-check');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/IP safe/')).toHaveCount(0);
    await expect(page.locator('text=/guaranteed safe/')).toHaveCount(0);
    await expect(page.locator('text=/legally cleared/')).toHaveCount(0);
    await expect(page.locator('text=/trademark cleared/')).toHaveCount(0);
    await expect(page.locator('text=/patent cleared/')).toHaveCount(0);
  });

  test('educational content present', async ({ page }) => {
    await page.goto('/tools/amazon-ip-check');
    await expect(page.locator('text=What This IP Risk Check Does')).toBeVisible();
    await expect(page.locator('text=Worked Examples')).toBeVisible();
    await expect(page.locator('text=Common Mistakes')).toBeVisible();
    await expect(page.locator('text=What This Result Does NOT Mean')).toBeVisible();
    await expect(page.locator('text=Limitations')).toBeVisible();
    await expect(page.locator('text=Related NicheScout Tools')).toBeVisible();
  });
});

test.describe('Restriction Check', () => {
  test('loads with disclaimer', async ({ page }) => {
    await page.goto('/tools/amazon-restriction-check');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('text=Research signal only')).toBeVisible();
  });

  test('detects restricted category', async ({ page }) => {
    await page.goto('/tools/amazon-restriction-check');
    await page.fill('input[placeholder*="Beauty"]', 'Grocery');
    await page.click('button:has-text("Check Restrictions")');

    await expect(page.locator('p:text("Restricted")').first()).toBeVisible();
    await expect(page.locator('text=gated category')).toBeVisible();
  });

  test('shows Seller Central verification notice', async ({ page }) => {
    await page.goto('/tools/amazon-restriction-check');
    await page.fill('input[placeholder*="Beauty"]', 'Beauty');
    await page.click('button:has-text("Check Restrictions")');
    await expect(page.locator('text=Seller Central Verification Required')).toBeVisible();
  });
});

test.describe('Sourcing Risk Check', () => {
  test('loads and assesses risk', async ({ page }) => {
    await page.goto('/tools/sourcing-risk-check');
    await expect(page.locator('text=Sourcing Risk Check').first()).toBeVisible();

    await page.click('button:has-text("Retailer")');
    await page.click('button:has-text("Poor")');
    await page.click('button:has-text("Assess Risk")');

    await expect(page.locator('p:text("high")').first()).toBeVisible();
  });
});

test.describe('Listing Analyzer', () => {
  test('loads with scoring', async ({ page }) => {
    await page.goto('/tools/amazon-listing-analyzer');
    await expect(page.getByRole('heading', { name: 'Listing Analyzer' })).toBeVisible();
  });

  test('analyzes a listing', async ({ page }) => {
    await page.goto('/tools/amazon-listing-analyzer');
    await page.fill('input[placeholder="Enter your product title"]', 'Premium Stainless Steel Water Bottle 24oz Double Wall Insulated BPA Free');
    await page.fill('input[placeholder="Bullet point 1"]', 'DOUBLE-WALL INSULATION — Keeps drinks cold for 24 hours or hot for 12 hours');
    await page.fill('input[placeholder="Bullet point 2"]', 'BPA-FREE AND SAFE — Made from food-grade 18/8 stainless steel');
    await page.fill('textarea[placeholder="Enter your product description"]', 'This premium water bottle is designed for active lifestyles. Made from durable stainless steel with double-wall vacuum insulation.');
    await page.fill('input[placeholder="keyword1, keyword2, keyword3"]', 'water bottle, insulated, stainless steel');
    await page.click('button:has-text("Analyze Listing")');

    await expect(page.locator('text=Overall Score')).toBeVisible();
    const labels = ['Excellent', 'Good', 'Needs Work', 'Poor'];
    let combined = page.locator(`text=${labels[0]}`);
    for (const label of labels.slice(1)) {
      combined = combined.or(page.locator(`text=${label}`));
    }
    await expect(combined).toBeVisible();
  });
});

test.describe('Title Checker', () => {
  test('checks a title', async ({ page }) => {
    await page.goto('/tools/amazon-title-checker');
    await page.fill('input[placeholder="Enter your product title"]', 'Premium Water Bottle');
    await page.click('button:has-text("Check Title")');
    await expect(page.locator('text=Title Score')).toBeVisible();
  });
});

test.describe('Bullet Checker', () => {
  test('checks bullets', async ({ page }) => {
    await page.goto('/tools/amazon-bullet-checker');
    await page.fill('input[placeholder="Bullet 1"]', 'This is a great product with amazing features');
    await page.fill('input[placeholder="Bullet 2"]', 'Made from high quality materials that last');
    await page.click('button:has-text("Check Bullets")');
    await expect(page.locator('text=Bullet Score')).toBeVisible();
  });
});

test.describe('Niche Analysis', () => {
  test('analyzes a niche', async ({ page }) => {
    await page.goto('/tools/niche-analysis');
    await page.fill('input[placeholder*="Silicone"]', 'Silicone Baking Mats');
    await page.fill('input[placeholder="24.99"]', '25');
    await page.fill('input[placeholder="500"]', '500');
    await page.fill('input[placeholder="4.5"]', '4.5');
    await page.fill('input[placeholder="1000"]', '1000');
    await page.click('button:has-text("Analyze Niche")');
    await expect(page.locator('text=Niche Score')).toBeVisible();
  });
});

test.describe('Product Research Checklist', () => {
  test('loads with checklist items', async ({ page }) => {
    await page.goto('/tools/product-research-checklist');
    await expect(page.locator('text=Product Research Checklist').first()).toBeVisible();
    await expect(page.locator('text=Identified target niche')).toBeVisible();
  });

  test('checkboxes are toggleable', async ({ page }) => {
    await page.goto('/tools/product-research-checklist');
    const checkbox = page.locator('label:has-text("Identified target niche")');
    await checkbox.click();
    await expect(checkbox).toHaveClass(/bg-green-50/);
  });

  test('generate report works', async ({ page }) => {
    await page.goto('/tools/product-research-checklist');
    await page.click('label:has-text("Identified target niche")');
    await page.click('label:has-text("Validated demand")');
    await page.click('button:has-text("Generate Report")');
    await expect(page.locator('text=Checklist Report')).toBeVisible();
  });
});
