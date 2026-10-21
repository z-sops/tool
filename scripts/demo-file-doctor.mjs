#!/usr/bin/env node
/**
 * Browser demonstration for the Bulk File Doctor (M1b).
 *
 * Starts the ListingAI dev server on an isolated port, drives a real browser
 * with synthetic data only, and writes screenshots plus the on-screen numbers
 * to an output folder. No other project or running process is touched.
 *
 * Usage: node scripts/demo-file-doctor.mjs [outputDir]
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { zipSync, strToU8 } from 'fflate';
import { findFreePort } from './free-port.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const outDir = path.resolve(process.argv[2] || path.join(repoRoot, 'demo-output'));

// Synthetic sample only: not a real seller catalogue and not real Amazon data.
const SAMPLE_CSV = [
  'seller-sku,item-name,brand-name,standard-price,quantity,product-description',
  'DEMO-SKU-001,  Demo Ceramic Mug  ,DemoBrand,12.50,25,Sample description for demo purposes only.',
  'DEMO-SKU-002,Demo Stainless Bottle,DemoBrand,24.00,10,Another sample row.',
  'DEMO-SKU-002,Duplicate Demo Bottle,DemoBrand,not-a-price,5,Duplicate sample row.',
  ',Demo Missing SKU,DemoBrand,9.99,3,Row with no SKU.',
].join('\r\n') + '\r\n';

const BLOCKED_CSV = 'seller-sku,item-name\r\nDEMO-SKU-003,=SUM(A1:A9)\r\n';

/** Builds a small workbook with two sheets for the demonstration. */
function buildXlsx() {
  const files = {};
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sheet = (rows) =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows
      .map((row, r) => `<row r="${r + 1}">${row.map((v, c) => `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`).join('')}</row>`)
      .join('')}</sheetData></worksheet>`;
  files['xl/worksheets/sheet1.xml'] = strToU8(sheet([
    ['seller-sku', 'item-name', 'standard-price'],
    ['DEMO-SKU-101', 'Demo Sheet One Item', '15.00'],
  ]));
  files['xl/worksheets/sheet2.xml'] = strToU8(sheet([
    ['seller-sku', 'item-name', 'standard-price'],
    ['DEMO-SKU-201', 'Demo Sheet Two Item', '25.00'],
  ]));
  files['xl/workbook.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Listings" sheetId="1" r:id="rId1"/><sheet name="Second" sheetId="2" r:id="rId2"/></sheets></workbook>`,
  );
  files['xl/_rels/workbook.xml.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`,
  );
  files['[Content_Types].xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`,
  );
  return Buffer.from(zipSync(files));
}

const port = await findFreePort(Number(process.env.LISTINGAI_TEST_PORT || 5181));
const host = '127.0.0.1';
const base = `http://${host}:${port}`;

const dev = spawn(
  process.execPath,
  [path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', host, '--port', String(port), '--strictPort'],
  { cwd: repoRoot, env: { ...process.env, LISTINGAI_DEV_PORT: String(port), PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] },
);

const stop = async () => {
  if (!dev.killed) dev.kill('SIGTERM');
};
process.on('exit', stop);
process.on('SIGINT', async () => { await stop(); process.exit(130); });

const waitForServer = async () => {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(base);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('dev server did not start');
};
await waitForServer();

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const summary = { port, baseUrl: base, steps: [] };

const shoot = async (page, name) => {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
};

const run = async (viewport, label) => {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const external = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(base) && !url.startsWith('blob:') && !url.startsWith('data:')) external.push(url);
  });

  await page.goto(`${base}/tools/amazon-bulk-file-doctor`);
  await page.getByRole('heading', { name: 'Amazon Bulk File Doctor' }).waitFor();
  await shoot(page, `${label}-1-empty.png`);

  // --- CSV flow ---
  await page.setInputFiles('[data-testid="file-doctor-upload"]', {
    name: 'demo-listings.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(SAMPLE_CSV, 'utf8'),
  });
  await page.getByTestId('stat-csv-rows').waitFor();
  const stats = {
    rows: await page.getByTestId('stat-csv-rows').textContent(),
    affectedRows: await page.getByTestId('stat-affected-rows').textContent(),
    errors: await page.getByTestId('stat-errors').textContent(),
    warnings: await page.getByTestId('stat-warnings').textContent(),
  };
  const groups = await page.getByTestId('file-doctor-groups').innerText();
  const template = await page.getByTestId('file-doctor-template').innerText();
  await shoot(page, `${label}-2-csv-results.png`);

  // --- Processing report ---
  await page.getByTestId('file-doctor-amazon-sample').click();
  await page.getByTestId('file-doctor-amazon-errors').waitFor();
  const amazonNote = await page.getByTestId('file-doctor-amazon-note').textContent();
  const amazonGroups = await page.getByTestId('file-doctor-amazon-group').count();
  await shoot(page, `${label}-3-processing-report.png`);

  // --- Correction approval ---
  const disabledBefore = await page.getByTestId('file-doctor-reviewed').isDisabled();
  await page.getByTestId('file-doctor-approve').check();
  const disabledAfter = await page.getByTestId('file-doctor-reviewed').isDisabled();
  const corrections = await page.getByTestId('file-doctor-corrections').innerText();
  await shoot(page, `${label}-4-correction-approval.png`);

  // --- XLSX with two sheets ---
  await page.setInputFiles('[data-testid="file-doctor-upload"]', {
    name: 'demo-workbook.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: buildXlsx(),
  });
  await page.getByTestId('file-doctor-sheet').waitFor();
  const sheetOptions = await page.getByTestId('file-doctor-sheet').innerText();
  const xlsxRows = await page.getByTestId('stat-csv-rows').textContent();
  await page.getByTestId('file-doctor-sheet').selectOption({ index: 1 });
  await page.getByTestId('stat-csv-rows').waitFor();
  const xlsxRowsSecondSheet = await page.getByTestId('stat-csv-rows').textContent();
  await shoot(page, `${label}-5-xlsx-sheets.png`);

  // --- Blocked export ---
  await page.setInputFiles('[data-testid="file-doctor-upload"]', {
    name: 'demo-formula.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(BLOCKED_CSV, 'utf8'),
  });
  await page.getByTestId('file-doctor-blocked').waitFor();
  await shoot(page, `${label}-6-blocked.png`);

  summary.steps.push({
    label,
    viewport,
    stats,
    groups,
    template,
    amazonNote,
    amazonGroups,
    correctionsProposed: corrections.includes('Leading and trailing whitespace'),
    reviewedDisabledWithoutApproval: disabledBefore,
    reviewedDisabledAfterApproval: disabledAfter,
    xlsxSheetOptions: sheetOptions,
    xlsxRowsFirstSheet: xlsxRows,
    xlsxRowsSecondSheet,
    externalRequests: external,
  });

  await context.close();
};

await run({ width: 1280, height: 900 }, 'desktop');
await run({ width: 375, height: 812 }, 'mobile');

await browser.close();
await stop();

await writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
