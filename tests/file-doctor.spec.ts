import { test, expect } from '@playwright/test';

const CSV_OK = 'sku,item-name,standard-price\nA-1,Widget,10.00\nA-2,Gadget,20.00\n';

const upload = async (page: import('@playwright/test').Page, name: string, body: string | Buffer, mime = 'text/csv') => {
  await page.setInputFiles('[data-testid="file-doctor-upload"]', {
    name,
    mimeType: mime,
    buffer: typeof body === 'string' ? Buffer.from(body, 'utf8') : body,
  });
};

test.describe('Bulk File Doctor (browser)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/amazon-bulk-file-doctor');
    await expect(page.getByRole('heading', { name: 'Amazon Bulk File Doctor' })).toBeVisible();
  });

  test('analyzes a CSV entirely in the browser and shows correct counts', async ({ page }) => {
    // Everything requested while the file is being analysed. The page chrome
    // may already have loaded CDN fonts, so the recorder is started here and
    // asserted to stay empty from the moment the file is handed over.
    const duringAnalysis: string[] = [];
    let recording = false;
    page.on('request', req => {
      if (!recording) return;
      const url = req.url();
      if (!url.startsWith('blob:') && !url.startsWith('data:')) duringAnalysis.push(`${req.method()} ${url}`);
    });

    await upload(page, 'listings.csv', CSV_OK);
    recording = true;
    await page.getByTestId('stat-csv-rows').waitFor();
    await expect(page.getByTestId('stat-csv-rows')).toHaveText('2');
    await expect(page.getByTestId('stat-affected-rows')).toHaveText('0');
    await expect(page.getByTestId('stat-errors')).toHaveText('0');
    await expect(page.getByTestId('stat-warnings')).toHaveText('0');
    await expect(page.getByTestId('file-doctor-groups')).toContainText('No preliminary issues detected');
    expect(duringAnalysis, 'no network request while the CSV is analysed').toEqual([]);
  });

  test('counts rows, issues and root-cause groups accurately', async ({ page }) => {
    await upload(page, 'issues.csv', 'sku,title,price\nA-1,,10.00\nA-1,,nope\n,Missing,5.00\n');
    await expect(page.getByTestId('stat-csv-rows')).toHaveText('3');
    await expect(page.getByTestId('stat-errors')).toHaveText('3');
    // warnings: DUPLICATE_SKU (row 3) + PRICE_FORMAT (row 3)
    await expect(page.getByTestId('stat-warnings')).toHaveText('2');
    await expect(page.getByTestId('stat-affected-rows')).toHaveText('3');
    await expect(page.getByTestId('file-doctor-groups')).toContainText('missing information');
    await expect(page.getByTestId('file-doctor-groups')).toContainText('duplicate data');
    await expect(page.getByTestId('file-doctor-groups')).toContainText('formatting');
    // 3 missing-information + 1 duplicate-data + 1 formatting = 5 findings
    await expect(page.getByTestId('file-doctor-groups')).toContainText('3 findings');
    await expect(page.getByTestId('file-doctor-groups')).toContainText('1 findings');
  });

  test('downloads the full JSON issue report', async ({ page }) => {
    await upload(page, 'report.csv', 'sku,title\nA-1,,x\n');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('file-doctor-json').click(),
    ]);
    expect(download.suggestedFilename()).toBe('report-issues.json');
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    expect(parsed.rows).toBe(1);
    expect(Array.isArray(parsed.issues)).toBe(true);
    expect(parsed.issues.length).toBeGreaterThan(0);
  });

  test('reviewed CSV export requires explicit approval', async ({ page }) => {
    await upload(page, 'approve.csv', 'sku,title\nA-1,  Widget  \n');
    const button = page.getByTestId('file-doctor-reviewed');
    await expect(button).toBeDisabled();
    await page.getByTestId('file-doctor-approve').check();
    await expect(button).toBeEnabled();
    const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
    expect(download.suggestedFilename()).toBe('approve-reviewed.csv');
  });

  test('malformed rows block the reviewed export', async ({ page }) => {
    await upload(page, 'bad-width.csv', 'sku,title\nA-1,Widget,EXTRA\n');
    await expect(page.getByTestId('file-doctor-blocked')).toBeVisible();
    await page.getByTestId('file-doctor-approve').check();
    await expect(page.getByTestId('file-doctor-reviewed')).toBeDisabled();
  });

  test('formula-risk cells block the reviewed export', async ({ page }) => {
    await upload(page, 'formula.csv', 'sku,title\nA-1,=SUM(A1:A9)\n');
    await expect(page.getByTestId('file-doctor-blocked')).toBeVisible();
    await page.getByTestId('file-doctor-approve').check();
    await expect(page.getByTestId('file-doctor-reviewed')).toBeDisabled();
  });

  test('rejects XLSX files with a clear message and uploads nothing', async ({ page }) => {
    await upload(page, 'workbook.xlsx', Buffer.from('PKfake'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await expect(page.getByTestId('file-doctor-error')).toContainText('XLSX');
    await expect(page.getByTestId('file-doctor-error')).toContainText('No data has been sent anywhere');
    await expect(page.getByTestId('stat-csv-rows')).toHaveCount(0);
  });

  test('rejects an oversized file before loading it', async ({ page }) => {
    await upload(page, 'huge.csv', Buffer.alloc(5 * 1024 * 1024 + 1024, 0x61));
    await expect(page.getByTestId('file-doctor-error')).toContainText('limit is 5 MB');
    await expect(page.getByTestId('file-doctor-error')).toContainText('was not loaded');
  });

  test('rejects a UTF-16 encoded file with a clear message', async ({ page }) => {
    await upload(page, 'utf16.csv', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('sku,title\nA,B\n', 'utf16le')]));
    await expect(page.getByTestId('file-doctor-error')).toContainText('UTF-16');
  });

  test('rejects an unsupported file type', async ({ page }) => {
    await upload(page, 'notes.txt', 'hello', 'text/plain');
    await expect(page.getByTestId('file-doctor-error')).toContainText('Unsupported file type');
  });

  test('does not mutate the uploaded content', async ({ page }) => {
    await upload(page, 'preserve.csv', 'sku,title,price\nA-1,  Widget  ,10.00\n');
    await page.getByTestId('file-doctor-approve').check();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('file-doctor-reviewed').click(),
    ]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    const text = Buffer.concat(chunks).toString('utf8');
    expect(text).toContain('A-1');
    expect(text).toContain('Widget');
    expect(text).toContain('10.00');
  });

  test('the page is usable on mobile without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/tools/amazon-bulk-file-doctor');
    await upload(page, 'mobile.csv', CSV_OK);
    await expect(page.getByTestId('stat-csv-rows')).toHaveText('2');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(376);
  });
});
