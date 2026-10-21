import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { assertListingAI } from '../global-setup';

/**
 * The e2e preflight guard. These tests prove that the guard rejects a server
 * that is not ListingAI, so the suite can never silently validate another
 * application that happens to occupy the chosen port.
 */

describe('e2e preflight identity guard', () => {
  it('accepts the real ListingAI document', async () => {
    const html = await readFile(path.join(process.cwd(), 'index.html'), 'utf8');
    expect(() => assertListingAI(html, 'http://127.0.0.1:5181')).not.toThrow();
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
    expect(() => assertListingAI(foreignHtml, 'http://localhost:3000')).toThrow(/NicheScout/);
  });

  it('rejects any document that is not the ListingAI application', () => {
    expect(() => assertListingAI('<html><body>hello</body></html>', 'http://127.0.0.1:5181')).toThrow(
      /did not serve the ListingAI application/,
    );
  });

  it('rejects a document that mentions another known application', () => {
    const html = '<html><title>Snap to Fit</title><script src="/src/main.tsx"></script><body>NicheScout</body></html>';
    expect(() => assertListingAI(html, 'http://127.0.0.1:5181')).toThrow(/different application/);
  });
});
