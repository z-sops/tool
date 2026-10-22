#!/usr/bin/env node
/**
 * Browser demonstration for the Bulk File Doctor.
 *
 * Starts the ListingAI dev server on an isolated port, uploads a synthetic CSV
 * and writes screenshots plus the on-screen numbers to an output folder.
 * No other project or running process is touched.
 *
 * Usage: node scripts/demo-file-doctor.mjs [outputDir]
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { findFreePort } from './free-port.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const outDir = path.resolve(process.argv[2] || path.join(repoRoot, 'demo-output'));

// Synthetic sample only: not a real seller catalogue and not real Amazon data.
const SAMPLE_CSV = [
  'item-sku,item-name,brand,standard-price,description',
  'DEMO-SKU-001,  Demo Ceramic Mug  ,DemoBrand,12.50,Sample description for demo purposes only.',
  'DEMO-SKU-002,Demo Stainless Bottle,DemoBrand,24.00,Another sample row.',
  'DEMO-SKU-002,Duplicate Demo Bottle,DemoBrand,not-a-price,Duplicate sample row.',
  ',Demo Missing SKU,DemoBrand,9.99,Row with no SKU.',
].join('\r\n') + '\r\n';

const BLOCKED_CSV = 'item-sku,item-name\r\nDEMO-SKU-003,=SUM(A1:A9)\r\n';

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
  await shoot(page, `${label}-2-results.png`);

  // Export gate: the reviewed CSV button must stay disabled without approval.
  const disabledBefore = await page.getByTestId('file-doctor-reviewed').isDisabled();
  await page.getByTestId('file-doctor-approve').check();
  const disabledAfter = await page.getByTestId('file-doctor-reviewed').isDisabled();
  await shoot(page, `${label}-3-approval.png`);

  // Blocked export: formula risk must block the reviewed CSV.
  await page.setInputFiles('[data-testid="file-doctor-upload"]', {
    name: 'demo-formula.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(BLOCKED_CSV, 'utf8'),
  });
  await page.getByTestId('file-doctor-blocked').waitFor();
  await shoot(page, `${label}-4-blocked.png`);

  // Unsupported file type.
  await page.setInputFiles('[data-testid="file-doctor-upload"]', {
    name: 'demo-workbook.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('PKdemo'),
  });
  await page.getByTestId('file-doctor-error').waitFor();
  const xlsxError = await page.getByTestId('file-doctor-error').textContent();
  await shoot(page, `${label}-5-xlsx-error.png`);

  summary.steps.push({ label, viewport, stats, groups, reviewedDisabledWithoutApproval: disabledBefore, reviewedDisabledAfterApproval: disabledAfter, xlsxError, externalRequests: external });

  await context.close();
};

await run({ width: 1280, height: 900 }, 'desktop');
await run({ width: 375, height: 812 }, 'mobile');

await browser.close();
await stop();

await writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
