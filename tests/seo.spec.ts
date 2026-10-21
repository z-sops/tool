import { test, expect } from '@playwright/test';

const PROD_URL = 'https://listingai-woad.vercel.app';

test.describe('SEO Infrastructure', () => {
  test.describe('robots.txt', () => {
    test('robots.txt is accessible', async ({ page }) => {
      const response = await page.goto(`/robots.txt`);
      expect(response?.status()).toBe(200);
      const content = await response?.text();
      expect(content).toContain('User-agent: *');
      expect(content).toContain('Allow: /');
      expect(content).toContain(`Sitemap: ${PROD_URL}/sitemap.xml`);
    });

    test('robots.txt disallows private pages', async ({ page }) => {
      const response = await page.goto(`/robots.txt`);
      const content = await response?.text();
      expect(content).toContain('Disallow: /my-research');
      expect(content).toContain('Disallow: /create');
    });
  });

  test.describe('sitemap.xml', () => {
    test('sitemap.xml is accessible', async ({ page }) => {
      const response = await page.goto(`/sitemap.xml`);
      expect(response?.status()).toBe(200);
      const content = await response?.text();
      expect(content).toContain('<?xml');
      expect(content).toContain('<urlset');
    });

    test('sitemap contains all public indexable routes', async ({ page }) => {
      const response = await page.goto(`/sitemap.xml`);
      const content = await response?.text();

      const expectedRoutes = [
        '/',
        '/explore',
        '/learn',
        '/compare',
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
        '/tools/amazon-bulk-file-doctor',
        '/about',
        '/privacy',
        '/terms',
      ];

      for (const route of expectedRoutes) {
        expect(content).toContain(`${PROD_URL}${route}`);
      }
    });

    test('sitemap does not contain private routes', async ({ page }) => {
      const response = await page.goto(`/sitemap.xml`);
      const content = await response?.text();
      expect(content).not.toContain('/my-research');
      expect(content).not.toContain('/create');
    });

    test('sitemap uses absolute production URLs', async ({ page }) => {
      const response = await page.goto(`/sitemap.xml`);
      const content = await response?.text();
      expect(content).toContain(PROD_URL);
    });
  });

  test.describe('Homepage SEO', () => {
    test('homepage has unique title', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/NicheScout/);
      await expect(page).toHaveTitle(/E-commerce Product/);
    });

    test('homepage has meta description', async ({ page }) => {
      await page.goto('/');
      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc).toBeTruthy();
      expect(desc!.length).toBeGreaterThan(20);
    });

    test('homepage has canonical URL', async ({ page }) => {
      await page.goto('/');
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBe(`${PROD_URL}/`);
    });

    test('homepage has Open Graph tags', async ({ page }) => {
      await page.goto('/');
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
      const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
      expect(ogTitle).toBeTruthy();
      expect(ogDesc).toBeTruthy();
      expect(ogUrl).toContain(PROD_URL);
    });

    test('homepage has robots index directive', async ({ page }) => {
      await page.goto('/');
      const robots = await page.locator('meta[name="robots"]').getAttribute('content');
      expect(robots).toBe('index, follow');
    });

    test('homepage has structured data', async ({ page }) => {
      await page.goto('/');
      const script = page.locator('script[type="application/ld+json"]');
      await expect(script).toHaveAttribute('type', 'application/ld+json');
      const content = await script.textContent();
      expect(content).toContain('WebSite');
      expect(content).toContain('NicheScout');
    });

    test('homepage has primary h1', async ({ page }) => {
      await page.goto('/');
      const h1 = page.locator('h1');
      await expect(h1.first()).toBeVisible();
    });
  });

  test.describe('Tool Page SEO', () => {
    const toolPages = [
      { path: '/tools/amazon-profit-calculator', titlePart: 'Profit Calculator', canonical: '/tools/amazon-profit-calculator' },
      { path: '/tools/amazon-roi-calculator', titlePart: 'ROI Calculator', canonical: '/tools/amazon-roi-calculator' },
      { path: '/tools/amazon-pricing-calculator', titlePart: 'Pricing Calculator', canonical: '/tools/amazon-pricing-calculator' },
      { path: '/tools/amazon-ip-check', titlePart: 'IP Risk Check', canonical: '/tools/amazon-ip-check' },
      { path: '/tools/amazon-restriction-check', titlePart: 'Restriction Check', canonical: '/tools/amazon-restriction-check' },
      { path: '/tools/sourcing-risk-check', titlePart: 'Sourcing Risk', canonical: '/tools/sourcing-risk-check' },
      { path: '/tools/amazon-listing-analyzer', titlePart: 'Listing Analyzer', canonical: '/tools/amazon-listing-analyzer' },
      { path: '/tools/amazon-title-checker', titlePart: 'Title Checker', canonical: '/tools/amazon-title-checker' },
      { path: '/tools/amazon-bullet-checker', titlePart: 'Bullet', canonical: '/tools/amazon-bullet-checker' },
      { path: '/tools/product-research-checklist', titlePart: 'Checklist', canonical: '/tools/product-research-checklist' },
      { path: '/tools/niche-analysis', titlePart: 'Niche Analysis', canonical: '/tools/niche-analysis' },
      { path: '/tools/amazon-bulk-file-doctor', titlePart: 'Bulk File Doctor', canonical: '/tools/amazon-bulk-file-doctor' },
    ];

    for (const tool of toolPages) {
      test(`${tool.titlePart} has unique title`, async ({ page }) => {
        await page.goto(tool.path);
        const title = await page.title();
        expect(title).toContain(tool.titlePart);
        expect(title).toContain('NicheScout');
      });

      test(`${tool.titlePart} has meta description`, async ({ page }) => {
        await page.goto(tool.path);
        const desc = await page.locator('meta[name="description"]').getAttribute('content');
        expect(desc).toBeTruthy();
        expect(desc!.length).toBeGreaterThan(20);
      });

      test(`${tool.titlePart} has canonical URL`, async ({ page }) => {
        await page.goto(tool.path);
        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        expect(canonical).toBe(`${PROD_URL}${tool.canonical}`);
      });

      test(`${tool.titlePart} has index directive`, async ({ page }) => {
        await page.goto(tool.path);
        const robots = await page.locator('meta[name="robots"]').getAttribute('content');
        expect(robots).toBe('index, follow');
      });
    }
  });

  test.describe('Non-indexable Pages', () => {
    test('my-research has noindex', async ({ page }) => {
      await page.goto('/my-research');
      const robots = await page.locator('meta[name="robots"]').getAttribute('content');
      expect(robots).toBe('noindex, nofollow');
    });

    test('create has noindex', async ({ page }) => {
      await page.goto('/create');
      const robots = await page.locator('meta[name="robots"]').getAttribute('content');
      expect(robots).toBe('noindex, nofollow');
    });
  });

  test.describe('Canonical URL Consistency', () => {
    test('canonical URLs do not contain query parameters', async ({ page }) => {
      await page.goto('/tools/amazon-profit-calculator?product=Test&price=24.99');
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).not.toContain('?');
      expect(canonical).not.toContain('product');
      expect(canonical).not.toContain('price');
    });

    test('each page has a unique canonical', async ({ page }) => {
      const pages = ['/', '/explore', '/learn', '/tools/amazon-profit-calculator'];
      const canonicals: string[] = [];

      for (const path of pages) {
        await page.goto(path);
        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        canonicals.push(canonical!);
      }

      const unique = new Set(canonicals);
      expect(unique.size).toBe(canonicals.length);
    });
  });

  test.describe('Open Graph Metadata', () => {
    test('learn page has Open Graph tags', async ({ page }) => {
      await page.goto('/learn');
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      expect(ogTitle).toContain('Learn');
    });

    test('compare page has Open Graph tags', async ({ page }) => {
      await page.goto('/compare');
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      expect(ogTitle).toContain('Compare');
    });
  });

  test.describe('SPA Route Direct Navigation', () => {
    const routes = [
      '/',
      '/explore',
      '/learn',
      '/compare',
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
      '/tools/amazon-bulk-file-doctor',
      '/about',
      '/privacy',
      '/terms',
    ];

    for (const route of routes) {
      test(`direct navigation to ${route} loads successfully`, async ({ page }) => {
        const response = await page.goto(`${route}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator('text=NicheScout').first()).toBeVisible();
      });
    }
  });

  test.describe('404 Handling', () => {
    test('unknown route shows 404 page', async ({ page }) => {
      await page.goto('/nonexistent-page-xyz');
      await expect(page.locator('text=404')).toBeVisible();
      await expect(page.locator('text=Page Not Found')).toBeVisible();
    });

    test('404 page has noindex', async ({ page }) => {
      await page.goto('/nonexistent-page-xyz');
      const robots = await page.locator('meta[name="robots"]').getAttribute('content');
      expect(robots).toContain('noindex');
    });
  });

  test.describe('Twitter Card Metadata', () => {
    test('homepage has twitter card', async ({ page }) => {
      await page.goto('/');
      const card = await page.locator('meta[name="twitter:card"]').getAttribute('content');
      expect(card).toBe('summary_large_image');
    });
  });
});
