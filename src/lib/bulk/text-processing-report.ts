/**
 * Amazon Processing Report parser (ListingAI M1b, task C).
 *
 * PROVENANCE AND LIMITS
 * Amazon's own Seller University troubleshooting guide describes the Processing
 * Report layout: the SKU that identifies the product is in column B, the error
 * code in column C and the error description in column E. This adapter reads
 * that documented layout, and prefers a header-driven interpretation when the
 * document contains a recognisable header row.
 *
 * This adapter is still **not validated against a genuine Amazon export**: no
 * real processing report has been supplied for this project. It is offered so a
 * seller can check the report they already have, and every conclusion it draws
 * is labelled as such. It never invents an error code: a code is read only when
 * the document actually carries one.
 */

import type { AmazonProcessingReport, AmazonReportAdapter, AmazonReportedError } from './amazon-errors';

const isBlank = (value: string) => value.trim().length === 0;

/** Splits a delimited line, honouring double-quoted fields. */
export function splitDelimited(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; } else { quoted = false; }
      } else current += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

/** Chooses the delimiter that splits the most fields, preferring tab. */
function detectDelimiter(lines: string[]): string {
  const candidates = ['\t', ',', ';', '|'];
  let best = '\t';
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = splitDelimited(lines[0] ?? '', candidate).length;
    if (count > bestCount) { bestCount = count; best = candidate; }
  }
  return best;
}

const HEADER_HINTS: { role: 'sku' | 'code' | 'message' | 'column'; words: string[] }[] = [
  { role: 'sku', words: ['sku', 'sellersku', 'itemsku'] },
  { role: 'code', words: ['errorcode', 'code', 'error'] },
  { role: 'message', words: ['errormessage', 'errordescription', 'description', 'message', 'error'] },
  { role: 'column', words: ['attribute', 'field', 'column', 'tab', 'template'] },
];

function classifyHeader(cells: string[]): Map<string, number> {
  const map = new Map<string, number>();
  cells.forEach((cell, index) => {
    const normalized = cell.trim().toLowerCase().replace(/[^a-z]/g, '');
    for (const hint of HEADER_HINTS) {
      if (map.has(hint.role)) continue;
      if (hint.words.some((w) => normalized === w || normalized.includes(w))) {
        map.set(hint.role, index);
        break;
      }
    }
  });
  return map;
}

/**
 * Positional fallback, following the layout in Amazon's Seller University
 * troubleshooting guide: SKU in column B, error code in column C, error
 * description in column E.
 */
const POSITIONAL = { sku: 1, code: 2, message: 4 } as const;

export const textProcessingReportAdapter: AmazonReportAdapter = {
  id: 'text-processing-report',
  label: 'Amazon Processing Report (tab-delimited text)',
  description:
    'Reads a downloaded Processing Report. Column meanings are taken from the header row when the document has one, ' +
    'otherwise from the layout in Amazon Seller University troubleshooting guidance (SKU in column B, error code in column C, error description in column E).',
  validatedAgainstAmazonOutput: false,

  parse(input: unknown): AmazonProcessingReport | null {
    if (typeof input !== 'string') return null;
    const text = input.replace(/^\uFEFF/, '');
    if (!text.trim()) return null;

    const lines = text.split(/\r\n|\n|\r/).filter((line) => !isBlank(line));
    if (!lines.length) return null;

    const delimiter = detectDelimiter(lines);
    const rows = lines.map((line) => splitDelimited(line, delimiter));

    // A header row is recognised when it names a SKU and an error column.
    let header = classifyHeader(rows[0]);
    let body = rows;
    if (!header.has('sku') || !header.has('code')) {
      header = new Map();
      body = rows;
    } else {
      body = rows.slice(1);
    }

    const usePositional = header.size === 0;
    const skuIndex = header.get('sku') ?? POSITIONAL.sku;
    const codeIndex = header.get('code') ?? POSITIONAL.code;
    const messageIndex = header.get('message') ?? POSITIONAL.message;
    const columnIndex = header.get('column');

    const errors: AmazonReportedError[] = [];
    for (const row of body) {
      const sku = (row[skuIndex] ?? '').trim();
      const code = (row[codeIndex] ?? '').trim();
      let message = (row[messageIndex] ?? '').trim();
      if (usePositional && !message) {
        // The guide places the description in column E. If that column is
        // empty, the remaining columns are scanned so a report that is laid
        // out slightly differently is still read rather than silently lost.
        for (let i = codeIndex + 1; i < row.length; i++) {
          const candidate = (row[i] ?? '').trim();
          if (candidate) { message = candidate; break; }
        }
      }
      const column = columnIndex !== undefined ? (row[columnIndex] ?? '').trim() : '';
      if (!sku && !code && !message) continue;
      if (!message && !code) continue;
      errors.push({
        errorCode: code || null,
        message: message || code || 'Reported without a description.',
        sku: sku || null,
        column: column || null,
        severity: 'error',
        raw: row,
      });
    }

    if (!errors.length) return null;

    return {
      origin: 'amazon-reported',
      adapterId: textProcessingReportAdapter.id,
      validatedAgainstAmazonOutput: false,
      errors,
      notes: [
        usePositional
          ? 'No header row was recognised, so the columns were read using the layout in Amazon Seller University troubleshooting guidance ' +
            '(SKU in column B, error code in column C, error description in column E).'
          : 'The columns were read from the header row of the document.',
        'This adapter has not been validated against a genuine Amazon export. Error codes are shown exactly as they appear in the document.',
      ],
    };
  },
};
