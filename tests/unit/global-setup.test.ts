import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { assertListingAI } from '../global-setup';

/**
 * The e2e preflight guard. These tests prove that the guard identifies
 * ListingAI by application-specific markers, and that it rejects any other
 * application that happens to occupy the chosen port.
 */

describe('e2e preflight identity guard', () => {
  it('accepts the real ListingAI document', async () => {
    const html = await readFile(path.join(process.cwd(), 'index.html'), 'utf8');
    expect(() => assertListingAI(html, 'http://127.0.0.1:5181')).not.toThrow();
  });

  it('requires application-specific markers, not the legacy brand string', async () => {
    const html = await readFile(path.join(process.cwd(), 'index.html'), 'utf8');
    expect(html).toContain('listingai:app');
    expect(html).toContain('listingai-woad.vercel.app');
    expect(html).toContain('/src/main.tsx');
  });

  it('rejects a document that only carries the legacy brand name', () => {
    const legacyOnly = '<html><head><title>NicheScout</title></head><body>NicheScout</body></html>';
    expect(() => assertListingAI(legacyOnly, 'http://127.0.0.1:5181')).toThrow(
      /did not serve the ListingAI application/,
    );
  });

  it('rejects the unrelated application that occupies port 3000', () => {
    // Markup captured read-only from the other application running on this
    // machine. It is a fixture that documents what the guard must reject.
    const foreignHtml = [
      '<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/>',
      '<title>MRCGP Intelligence System (Gate A)</title>',
      '<script src="/_next/static/chunks/3lujys0kupeuw.js" async></script>',
      '</head><body><div id="__next"></div></body></html>',
    ].join('');
    expect(() => assertListingAI(foreignHtml, 'http://localhost:3000')).toThrow(/Refusing to run the suite/);
  });

  it('rejects any document that is not the ListingAI application', () => {
    expect(() => assertListingAI('<html><body>hello</body></html>', 'http://127.0.0.1:5181')).toThrow(
      /did not serve the ListingAI application/,
    );
  });

  it('rejects a document that mentions another known application', () => {
    const html = [
      '<html><head><meta name="listingai:app" content="listingai-web" />',
      '<link rel="canonical" href="https://listingai-woad.vercel.app/" />',
      '<script src="/src/main.tsx"></script></head><body>Snap to Fit</body></html>',
    ].join('');
    expect(() => assertListingAI(html, 'http://127.0.0.1:5181')).toThrow(/different application/);
  });
});
