import { test, expect } from '@playwright/test';
import { zipSync, strToU8 } from 'fflate';

const CSV_OK = 'sku,item-name,standard-price\nA-1,Widget,10.00\nA-2,Gadget,20.00\n';

const upload = async (
  page: import('@playwright/test').Page,
  name: string,
  body: string | Buffer,
  mime = 'text/csv',
) => {
  await page.setInputFiles('[data-testid="file-doctor-upload"]', {
    name,
    mimeType: mime,
    buffer: typeof body === 'string' ? Buffer.from(body, 'utf8') : body,
  });
};

const colName = (i: number) => {
  let name = '';
  let n = i;
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
};

/** Builds a minimal .xlsx archive in the test process. */
function buildXlsx(
  sheets: { name: string; rows: string[][]; formulas?: Record<string, string> }[],
): Buffer {
  const files: Record<string, Uint8Array> = {};
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  sheets.forEach((sheet, index) => {
    const rows = sheet.rows
      .map((row, r) => {
        const cells = row
          .map((value, c) => {
            const ref = colName(c) + String(r + 1);
            const f = sheet.formulas?.[`${r}:${c}`] !== undefined ? `<f>${esc(sheet.formulas![`${r}:${c}`])}</f>` : '';
            if (value === '') return `<c r="${ref}">${f}</c>`;
            return `<c r="${ref}" t="inlineStr">${f}<is><t xml:space="preserve">${esc(value)}</t></is></c>`;
          })
          .join('');
        return `<row r="${r + 1}">${cells}</row>`;
      })
      .join('');
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`,
    );
  });
  files['xl/workbook.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
      .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('')}</sheets></workbook>`,
  );
  files['xl/_rels/workbook.xml.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
      .join('')}</Relationships>`,
  );
  files['[Content_Types].xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`,
  );
  return Buffer.from(zipSync(files));
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Builds a workbook whose worksheets carry their rows at explicit Excel row
 * numbers, so a worksheet can omit blank rows the way a real spreadsheet does.
 *
 * `sheets` gives the physical row of every row of the sheet, in order.
 */
function buildXlsxAtRows(
  sheets: { name: string; rowNumbers: number[]; rows: string[][] }[],
): Buffer {
  const files: Record<string, Uint8Array> = {};
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  sheets.forEach((sheet, index) => {
    const rows = sheet.rows
      .map((row, r) => {
        const cells = row
          .map((value, c) => {
            const ref = colName(c) + String(sheet.rowNumbers[r]);
            if (value === '') return `<c r="${ref}"/>`;
            return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
          })
          .join('');
        return `<row r="${sheet.rowNumbers[r]}">${cells}</row>`;
      })
      .join('');
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`,
    );
  });
  files['xl/workbook.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
      .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('')}</sheets></workbook>`,
  );
  files['xl/_rels/workbook.xml.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map((_, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`)
      .join('')}</Relationships>`,
  );
  files['[Content_Types].xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`,
  );
  return Buffer.from(zipSync(files));
}

/**
 * Replaces the read of one named file with a read the test releases by hand.
 *
 * Reading a processing report is asynchronous. The test needs to start that
 * read, change the selected worksheet while it is still in flight, and only
 * then let it finish, so the race is deterministic rather than timing
 * dependent.
 */
async function deferFileRead(page: import('@playwright/test').Page, fileName: string) {
  await page.addInitScript((name) => {
    const original = File.prototype.text;
    File.prototype.text = function (this: File) {
      if (this.name !== name) return original.call(this);
      return new Promise<string>((resolve, reject) => {
        (window as unknown as { __releaseDeferredRead?: () => void }).__releaseDeferredRead = () => {
          original.call(this).then(resolve, reject);
        };
      });
    };
  }, fileName);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Amazon Bulk File Doctor' })).toBeVisible();
}

/** Records anything that could carry seller data out of the page. */
function watchForLeaks(page: import('@playwright/test').Page) {
  const leaks: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith('blob:') || url.startsWith('data:')) return;
    const isSameOrigin = url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost');
    const hasBody = req.method() !== 'GET' && req.method() !== 'HEAD';
    const postData = req.postData();
    if (!isSameOrigin || hasBody || postData) {
      leaks.push(`${req.method()} ${url}${postData ? ' body=' + postData : ''}`);
    }
    if (/[?&][^=&]*(data|content|file|upload)=/i.test(url)) {
      leaks.push('QUERY ' + url);
    }
  });
  return leaks;
}

test.describe('Bulk File Doctor (browser)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/amazon-bulk-file-doctor');
    await expect(page.getByRole('heading', { name: 'Amazon Bulk File Doctor' })).toBeVisible();
  });

  /* ---------------- C5: privacy network integrity ---------------- */

  test('does not transmit the uploaded file to the server or a third party', async ({ page }) => {
    // The recorder is installed before the upload is even dispatched.
    const leaks = watchForLeaks(page);
    await upload(page, 'listings.csv', CSV_OK);
    await page.getByTestId('stat-csv-rows').waitFor();
    await expect(page.getByTestId('stat-csv-rows')).toHaveText('2');
    expect(leaks, 'no request may carry seller data').toEqual([]);
  });

  test('does not put the file content in a request body or a query string', async ({ page }) => {
    const bodies: string[] = [];
    const urls: string[] = [];
    page.on('request', (req) => {
      const data = req.postData();
      if (data) bodies.push(data);
      urls.push(req.url());
    });
    await upload(page, 'listings.csv', 'sku,item-name\nSYNTHETIC-SELLER-SKU-1,Widget\n');
    await page.getByTestId('stat-csv-rows').waitFor();
    await expect(page.getByTestId('stat-csv-rows')).toHaveText('1');
    expect(bodies.join('\n')).not.toContain('SYNTHETIC-SELLER-SKU-1');
    expect(urls.join('\n')).not.toContain('SYNTHETIC-SELLER-SKU-1');
  });

  test('privacy detector catches a deliberate synthetic leak (negative control)', async ({ page }) => {
    const leaks = watchForLeaks(page);
    // A deliberate, synthetic leak. If the detector cannot see this, every
    // other privacy assertion in this file would be worthless.
    await page.evaluate(() => {
      void fetch('/api/synthetic-leak?data=' + encodeURIComponent('SYNTHETIC-SECRET-VALUE'));
    });
    await page.waitForTimeout(500);
    expect(leaks.some((l) => l.includes('SYNTHETIC-SECRET-VALUE'))).toBe(true);
  });

  /* ---------------- C1: lossless export ---------------- */

  test('a workbook with more rows than the reader limit refuses the export', async ({ page }) => {
    const rows: string[][] = [['seller-sku', 'item-name']];
    for (let i = 0; i < 5001; i++) rows.push(['SKU-' + i, 'Item ' + i]);
    await upload(page, 'big.xlsx', buildXlsx([{ name: 'Big', rows }]), XLSX_MIME);
    await expect(page.getByTestId('file-doctor-truncation')).toBeVisible();
    await expect(page.getByTestId('file-doctor-export-reason')).toContainText('silently lose data');
    await expect(page.getByTestId('file-doctor-reviewed')).toBeDisabled();
  });

  test('a workbook export is labelled a derived export that is not the template', async ({ page }) => {
    await upload(
      page,
      'workbook.xlsx',
      buildXlsx([
        { name: 'Listings', rows: [['seller-sku', 'item-name'], ['A-1', 'Widget']] },
        { name: 'Second', rows: [['seller-sku', 'item-name'], ['A-2', 'Gadget']] },
      ]),
      XLSX_MIME,
    );
    const caveats = page.getByTestId('file-doctor-export-caveats');
    await expect(caveats).toContainText('derived CSV of the worksheet');
    await expect(caveats).toContainText('Amazon template structure of the workbook is not preserved');
    await expect(caveats).toContainText('1 other worksheet(s)');
  });

  test('an export keeps the instruction rows that sit above the header', async ({ page }) => {
    const csv = 'Amazon category listing template\r\nFill in the yellow cells\r\nseller-sku,item-name\r\nA-1,  Widget  \r\n';
    await upload(page, 'template.csv', csv);
    await expect(page.getByTestId('file-doctor-header-note')).toContainText('source row 3');
    await page.getByTestId('file-doctor-approve').check();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('file-doctor-reviewed').click(),
    ]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    const text = Buffer.concat(chunks).toString('utf8');
    expect(text).toContain('Amazon category listing template');
    expect(text).toContain('Fill in the yellow cells');
    expect(text).toContain('seller-sku,item-name');
    expect(text).toContain('A-1,Widget');
  });

  test('the original file downloads byte for byte', async ({ page }) => {
    const original = 'seller-sku,item-name\r\nA-1,  Widget  \r\nA-2,"Quoted, value"\r\n';
    await upload(page, 'original.csv', original);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('file-doctor-original').click(),
    ]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    expect(Buffer.concat(chunks).toString('utf8')).toBe(original);
  });

  /* ---------------- C4: upload race ---------------- */

  test('the last file selected is the file that stays on screen', async ({ page }) => {
    const many = ['sku,item-name'];
    for (let i = 0; i < 4000; i++) many.push('SLOW-SKU-' + i + ',Item ' + i);
    const slow = many.join('\r\n') + '\r\n';
    const fast = 'sku,item-name\nFAST-SKU-1,Widget\n';

    await upload(page, 'slow.csv', slow);
    await upload(page, 'fast.csv', fast);

    await expect(page.getByTestId('stat-csv-rows')).toHaveText('1');
    // The newer file wins, and the slower one never overwrites it.
    await expect(page.getByTestId('file-doctor-issues')).not.toContainText('SLOW-SKU');
  });

  /* ---------------- existing behaviour ---------------- */

  test('analyzes a CSV entirely in the browser and shows correct counts', async ({ page }) => {
    await upload(page, 'listings.csv', CSV_OK);
    await expect(page.getByTestId('stat-csv-rows')).toHaveText('2');
    await expect(page.getByTestId('stat-affected-rows')).toHaveText('0');
    await expect(page.getByTestId('stat-errors')).toHaveText('0');
    await expect(page.getByTestId('stat-warnings')).toHaveText('0');
    await expect(page.getByTestId('file-doctor-groups')).toContainText('No preliminary issues detected');
  });

  test('counts rows, issues and root-cause groups accurately', async ({ page }) => {
    await upload(page, 'issues.csv', 'sku,title,price\nA-1,,10.00\nA-1,,nope\n,Missing,5.00\n');
    await expect(page.getByTestId('stat-csv-rows')).toHaveText('3');
    await expect(page.getByTestId('stat-errors')).toHaveText('3');
    await expect(page.getByTestId('stat-warnings')).toHaveText('2');
    await expect(page.getByTestId('stat-affected-rows')).toHaveText('3');
    await expect(page.getByTestId('file-doctor-groups')).toContainText('missing information');
    await expect(page.getByTestId('file-doctor-groups')).toContainText('duplicate data');
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
    expect(parsed.exportPlan).toBeDefined();
  });

  test('identifies the template and maps the seller roles', async ({ page }) => {
    await upload(page, 'flat.csv', 'seller-sku,item-name,brand-name,standard-price,quantity\nA-1,Widget,DemoBrand,10.00,5\n');
    await expect(page.getByTestId('file-doctor-template')).toContainText('Amazon flat-file upload');
    const roles = page.getByTestId('file-doctor-roles');
    await expect(roles).toContainText('mapped to sku');
    await expect(roles).toContainText('mapped to title');
    await expect(roles).toContainText('mapped to brand');
    await expect(roles).toContainText('mapped to price');
    await expect(roles).toContainText('mapped to quantity');
  });

  test('states that required fields are not validated without a verified schema', async ({ page }) => {
    await upload(page, 'flat.csv', 'seller-sku,item-name\nA-1,Widget\n');
    await expect(page.getByTestId('file-doctor-template')).toContainText('Required-field validation is unavailable');
  });

  test('shows an unsupported-template message and preserves the original data', async ({ page }) => {
    await upload(page, 'unknown.csv', 'colour,material,weight\nred,steel,500\n');
    await expect(page.getByTestId('file-doctor-unsupported-template')).toContainText('Unsupported template');
    await expect(page.getByTestId('file-doctor-unsupported-template')).toContainText('No assumption has been made');
    await expect(page.getByTestId('stat-csv-rows')).toHaveText('1');
  });

  test('reads an XLSX workbook and offers worksheet selection', async ({ page }) => {
    const bytes = buildXlsx([
      { name: 'Listings', rows: [['seller-sku', 'item-name'], ['A-1', 'Widget']] },
      { name: 'Second', rows: [['seller-sku', 'item-name'], ['A-2', 'Gadget']] },
    ]);
    await upload(page, 'workbook.xlsx', bytes, XLSX_MIME);
    await expect(page.getByTestId('stat-csv-rows')).toHaveText('1');
    await expect(page.getByTestId('file-doctor-sheet')).toBeVisible();
    await page.getByTestId('file-doctor-sheet').selectOption({ index: 1 });
    await expect(page.getByTestId('stat-csv-rows')).toHaveText('1');
    await expect(page.getByTestId('file-doctor-template')).toContainText('Amazon flat-file upload');
  });

  test('blocks the export when a cell holds an Excel formula with no stored value', async ({ page }) => {
    const bytes = buildXlsx([{ name: 'S', rows: [['seller-sku', 'item-name'], ['A-1', '']], formulas: { '1:1': 'SUM(A1:A9)' } }]);
    await upload(page, 'formula.xlsx', bytes, XLSX_MIME);
    await expect(page.getByTestId('file-doctor-blocked')).toBeVisible();
    await page.getByTestId('file-doctor-approve').check();
    await expect(page.getByTestId('file-doctor-reviewed')).toBeDisabled();
  });

  test('blocks the export when a cell contains hidden characters', async ({ page }) => {
    const bytes = buildXlsx([{ name: 'S', rows: [['seller-sku', 'item-name'], ['A-1', 'Widget\u202Ehidden']] }]);
    await upload(page, 'spoof.xlsx', bytes, XLSX_MIME);
    await expect(page.getByTestId('file-doctor-blocked')).toBeVisible();
    await expect(page.getByTestId('file-doctor-issues')).toContainText('bidirectional override');
  });

  test('rejects a legacy .xls file with a clear message', async ({ page }) => {
    await upload(page, 'legacy.xls', Buffer.from('legacy'), 'application/vnd.ms-excel');
    await expect(page.getByTestId('file-doctor-error')).toContainText('Legacy .xls files are not supported');
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

  test('loads a synthetic processing report, labels it, and matches SKUs to rows', async ({ page }) => {
    await upload(page, 'listings.csv', 'sku,item-name\nA-1,Widget\nA-2,Gadget\n');
    await page.getByTestId('file-doctor-amazon-sample').click();
    await expect(page.getByTestId('file-doctor-amazon-note')).toContainText('not Amazon output');
    const groups = page.getByTestId('file-doctor-amazon-group');
    await expect(groups.first()).toBeVisible();
    await expect(groups.first()).toContainText('affected row(s)');
    await expect(groups.first()).toContainText('ListingAI classification');
  });

  test('reads a tab-delimited Amazon Processing Report and matches it to the file rows', async ({ page }) => {
    await upload(page, 'listings.csv', 'seller-sku,item-name\nDEMO-SKU-001,Widget\nDEMO-SKU-002,Gadget\n');
    const report = [
      'Feed Type\tSKU\tError Code\tError Description\tComment',
      'Flat File\tDEMO-SKU-001\t90220\tValue is not valid for this category\tCheck the product type',
      'Flat File\tDEMO-SKU-009\t8058\tThe following attributes are missing\t',
    ].join('\n');
    await page.setInputFiles('[data-testid="file-doctor-amazon-upload"]', {
      name: 'Processing Report.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(report, 'utf8'),
    });
    const groups = page.getByTestId('file-doctor-amazon-group');
    await expect(groups.first()).toBeVisible();
    await expect(groups).toHaveCount(2);
    const panel = page.getByTestId('file-doctor-amazon-errors');
    await expect(panel).toContainText('90220');
    await expect(panel).toContainText('8058');
    await expect(panel).toContainText('DEMO-SKU-001');
    await expect(panel).toContainText('DEMO-SKU-009');
  });

  test('downloads the processing-report review as JSON', async ({ page }) => {
    await upload(page, 'listings.csv', 'sku,item-name\nA-1,Widget\n');
    await page.getByTestId('file-doctor-amazon-sample').click();
    await expect(page.getByTestId('file-doctor-amazon-errors')).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('file-doctor-amazon-json').click(),
    ]);
    expect(download.suggestedFilename()).toBe('listings-amazon-report.json');
  });

  test('corrected CSV export requires explicit approval and shows a before/after diff', async ({ page }) => {
    await upload(page, 'approve.csv', 'seller-sku,item-name\n A-1 ,  Widget  \n');
    const button = page.getByTestId('file-doctor-reviewed');
    await expect(button).toBeDisabled();
    await expect(page.getByTestId('file-doctor-corrections')).toContainText('Widget');
    await page.getByTestId('file-doctor-approve').check();
    await expect(button).toBeEnabled();
    await expect(button).toContainText('1 approved');
    const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
    expect(download.suggestedFilename()).toBe('approve-corrected.csv');
  });

  test('applies only the corrections the user selected', async ({ page }) => {
    await upload(page, 'partial.csv', 'seller-sku,item-name,description\n A-1 ,  Widget  ,  Text  \n');
    await page.getByTestId('file-doctor-approve').check();
    const rows = page.getByTestId('file-doctor-correction-row');
    await expect(rows).toHaveCount(2);
    await rows.nth(1).locator('input[type=checkbox]').uncheck();
    await expect(page.getByTestId('file-doctor-reviewed')).toContainText('1 approved');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('file-doctor-reviewed').click(),
    ]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    const text = Buffer.concat(chunks).toString('utf8');
    // The title was approved and trimmed; the description was not, and the
    // identifier column is never touched.
    expect(text).toContain(' A-1 ,Widget,  Text  ');
  });

  test('never alters an identifier column', async ({ page }) => {
    await upload(page, 'identifier.csv', 'seller-sku,item-name\n  A-1  ,Widget\n');
    await page.getByTestId('file-doctor-approve').check();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('file-doctor-reviewed').click(),
    ]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    const text = Buffer.concat(chunks).toString('utf8');
    expect(text).toContain('  A-1  ');
  });

  test('malformed rows block the corrected export', async ({ page }) => {
    await upload(page, 'bad-width.csv', 'sku,title\nA-1,Widget,EXTRA\n');
    await expect(page.getByTestId('file-doctor-blocked')).toBeVisible();
    await page.getByTestId('file-doctor-approve').check();
    await expect(page.getByTestId('file-doctor-reviewed')).toBeDisabled();
  });

  test('formula-risk cells block the corrected export', async ({ page }) => {
    await upload(page, 'formula.csv', 'sku,title\nA-1,=SUM(A1:A9)\n');
    await expect(page.getByTestId('file-doctor-blocked')).toBeVisible();
    await page.getByTestId('file-doctor-approve').check();
    await expect(page.getByTestId('file-doctor-reviewed')).toBeDisabled();
  });

  test('the page is usable on mobile without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/tools/amazon-bulk-file-doctor');
    await upload(page, 'mobile.csv', CSV_OK);
    await expect(page.getByTestId('stat-csv-rows')).toHaveText('2');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(376);
  });

  /* ---------------- R3-1: processing report versus worksheet switching ---------------- */

  test('a processing report that finishes after a worksheet switch never matches the worksheet it left', async ({ page }) => {
    await deferFileRead(page, 'slow-report.json');

    // Sheet A holds the SKU at Excel row 2, sheet B holds the same SKU at
    // Excel row 9. A match calculated for A therefore names a different row
    // than a match calculated for B, which makes a stale match visible.
    await upload(
      page,
      'sheets.xlsx',
      buildXlsxAtRows([
        { name: 'SheetA', rowNumbers: [1, 2], rows: [['seller-sku', 'item-name'], ['SHARED-SKU', 'From A']] },
        { name: 'SheetB', rowNumbers: [1, 9], rows: [['seller-sku', 'item-name'], ['SHARED-SKU', 'From B']] },
      ]),
      XLSX_MIME,
    );
    const sheetSelect = page.getByTestId('file-doctor-sheet');
    await expect(sheetSelect).toBeVisible();
    await expect(sheetSelect).toHaveValue('0');

    // Start the import against sheet A. The read is held open by the test.
    await page.setInputFiles('[data-testid="file-doctor-amazon-upload"]', {
      name: 'slow-report.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({ errors: [{ message: 'invalid', sku: 'SHARED-SKU', errorCode: '90220' }] }),
        'utf8',
      ),
    });
    await page.waitForFunction(() => typeof (window as unknown as { __releaseDeferredRead?: () => void }).__releaseDeferredRead === 'function');

    // The seller moves to sheet B while the report is still being read.
    await sheetSelect.selectOption('1');
    await expect(sheetSelect).toHaveValue('1');

    // Only now does the old import finish.
    await page.evaluate(() => (window as unknown as { __releaseDeferredRead?: () => void }).__releaseDeferredRead?.());
    await page.waitForTimeout(750);

    // No association calculated for sheet A may be shown on sheet B.
    await expect(page.getByTestId('file-doctor-amazon-errors')).toHaveCount(0);
    await expect(page.locator('text=SHARED-SKU')).toHaveCount(0);
  });

  test('a processing report is reconciled again against the worksheet the seller moved to', async ({ page }) => {
    await upload(
      page,
      'sheets.xlsx',
      buildXlsxAtRows([
        { name: 'SheetA', rowNumbers: [1, 2], rows: [['seller-sku', 'item-name'], ['SHARED-SKU', 'From A']] },
        { name: 'SheetB', rowNumbers: [1, 9], rows: [['seller-sku', 'item-name'], ['SHARED-SKU', 'From B']] },
      ]),
      XLSX_MIME,
    );
    const sheetSelect = page.getByTestId('file-doctor-sheet');
    await expect(sheetSelect).toBeVisible();

    await page.setInputFiles('[data-testid="file-doctor-amazon-upload"]', {
      name: 'report.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({ errors: [{ message: 'invalid', sku: 'SHARED-SKU', errorCode: '90220' }] }),
        'utf8',
      ),
    });
    await expect(page.getByTestId('file-doctor-amazon-errors')).toBeVisible();
    // The match belongs to sheet A, whose data is at Excel row 2.
    await expect(page.getByTestId('file-doctor-amazon-errors')).toContainText('source row(s): 2');

    // After the switch the report is reconciled again, so the row is sheet B's.
    await sheetSelect.selectOption('1');
    await expect(sheetSelect).toHaveValue('1');
    await expect(page.getByTestId('file-doctor-amazon-errors')).toContainText('source row(s): 9');
    await expect(page.getByTestId('file-doctor-amazon-errors')).not.toContainText('source row(s): 2');
  });

  test('duplicate and overlapping SKUs are matched against the worksheet on screen', async ({ page }) => {
    await upload(
      page,
      'sheets.xlsx',
      buildXlsxAtRows([
        {
          name: 'SheetA',
          rowNumbers: [1, 2, 3],
          rows: [['seller-sku', 'item-name'], ['DUP-SKU', 'From A'], ['DUP-SKU', 'From A again']],
        },
        {
          name: 'SheetB',
          rowNumbers: [1, 7, 8],
          rows: [['seller-sku', 'item-name'], ['DUP-SKU', 'From B'], ['DUP-SKU', 'From B again']],
        },
      ]),
      XLSX_MIME,
    );
    const sheetSelect = page.getByTestId('file-doctor-sheet');
    await expect(sheetSelect).toBeVisible();

    await page.setInputFiles('[data-testid="file-doctor-amazon-upload"]', {
      name: 'report.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({ errors: [{ message: 'invalid', sku: 'DUP-SKU', errorCode: '90220' }] }),
        'utf8',
      ),
    });
    await expect(page.getByTestId('file-doctor-amazon-errors')).toContainText('source row(s): 2, 3');

    await sheetSelect.selectOption('1');
    await expect(sheetSelect).toHaveValue('1');
    await expect(page.getByTestId('file-doctor-amazon-errors')).toContainText('source row(s): 7, 8');
    await expect(page.getByTestId('file-doctor-amazon-errors')).not.toContainText('source row(s): 2, 3');
  });

  /* ---------------- R3-2: physical worksheet coordinates ---------------- */

  test('a sparse worksheet reports its findings at the physical worksheet rows', async ({ page }) => {
    // Instruction row at Excel row 1, the real headers at Excel row 5 and the
    // data at Excel row 9.
    await upload(
      page,
      'sparse.xlsx',
      buildXlsxAtRows([
        {
          name: 'Listings',
          rowNumbers: [1, 5, 9],
          rows: [['Instructions'], ['seller-sku', 'item-name'], ['A-1', 'Widget']],
        },
      ]),
      XLSX_MIME,
    );
    await expect(page.getByTestId('stat-csv-rows')).toHaveText('1');

    // The header is reported at its physical row, not at the position it had
    // among the rows the file carried.
    await expect(page.getByTestId('file-doctor-header-note')).toContainText('Header row detected at source row 5');
  });
});
