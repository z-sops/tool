/**
 * Amazon processing / error report intelligence (ListingAI M1b, task C).
 *
 * HONESTY CONSTRAINTS
 * 1. This module NEVER manufactures an Amazon error. An "Amazon error" only
 *    exists when an adapter has read one from a document that Amazon produced.
 *    Everything the tool detects by itself is a *source file* finding, reported
 *    under a different origin and without an Amazon error code.
 * 2. The error *classification* below is ListingAI's own keyword heuristic. It
 *    is not Amazon's taxonomy and must never be presented as such.
 * 3. Until a genuine, anonymised Amazon processing report is available, no
 *    adapter is marked `validatedAgainstAmazonOutput` and the bundled fixture
 *    is explicitly synthetic.
 */

import { textProcessingReportAdapter } from './text-processing-report';
import {
  MAX_REPORT_MESSAGE_CHARS,
  MAX_REPORT_RECORDS,
} from './limits';

export type ErrorOrigin = 'source-file' | 'amazon-reported';

export { MAX_REPORT_BYTES, MAX_REPORT_RECORDS, MAX_REPORT_RECORD_CHARS, MAX_REPORT_MESSAGE_CHARS } from './limits';

export interface AmazonReportedError {
  /**
   * The error code exactly as it appears in the source document, or null when
   * the document did not provide one. Never derived from a local heuristic.
   */
  errorCode: string | null;
  message: string;
  sku: string | null;
  column: string | null;
  severity: 'error' | 'warning';
  /** The untouched record from the source document. */
  raw: unknown;
}

export interface AmazonProcessingReport {
  origin: 'amazon-reported';
  adapterId: string;
  /**
   * True only when the adapter has been validated against a genuine Amazon
   * processing report. False for every adapter shipped today.
   */
  validatedAgainstAmazonOutput: boolean;
  errors: AmazonReportedError[];
  notes: string[];
}

export interface AmazonReportAdapter {
  id: string;
  label: string;
  description: string;
  validatedAgainstAmazonOutput: boolean;
  /** Returns null when the input does not match this adapter's shape. */
  parse(input: unknown): AmazonProcessingReport | null;
}

/* ------------------------------------------------------------------ */
/* Classification (ListingAI heuristic, not Amazon's taxonomy)         */
/* ------------------------------------------------------------------ */

export type ErrorCategory =
  | 'format'
  | 'missing-attribute'
  | 'invalid-value'
  | 'relationship'
  | 'category-requirement'
  | 'brand-authorization'
  | 'unknown';

export interface ErrorClassification {
  category: ErrorCategory;
  /** 0 to 1. */
  confidence: number;
  /** The words that drove the classification. */
  basis: string[];
  /** Always 'listingai-heuristic': this is not Amazon's own classification. */
  source: 'listingai-heuristic';
}

const CATEGORY_RULES: { category: ErrorCategory; words: string[] }[] = [
  { category: 'relationship', words: ['parent', 'child', 'variation', 'relationship', 'parentage'] },
  { category: 'category-requirement', words: ['product type', 'category', 'browse node', 'subcategory', 'department'] },
  { category: 'brand-authorization', words: ['brand', 'authorization', 'authorisation', 'trademark', 'gated', 'approval'] },
  { category: 'missing-attribute', words: ['required', 'missing', 'must be', 'not provided', 'is mandatory'] },
  { category: 'invalid-value', words: ['invalid', 'not valid', 'does not match', 'out of range', 'not allowed'] },
  { category: 'format', words: ['format', 'delimiter', 'column', 'header', 'encoding', 'could not parse', 'quote'] },
];

/**
 * Classifies a reported error by looking for known words in its message.
 * This is a ListingAI heuristic to help a seller prioritise, not a statement
 * about what Amazon means.
 */
export function classifyError(error: AmazonReportedError): ErrorClassification {
  const haystack = `${error.errorCode ?? ''} ${error.message}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    const basis = rule.words.filter((word) => haystack.includes(word));
    if (basis.length) {
      return {
        category: rule.category,
        confidence: Math.min(1, 0.5 + basis.length * 0.15),
        basis,
        source: 'listingai-heuristic',
      };
    }
  }
  return { category: 'unknown', confidence: 0, basis: [], source: 'listingai-heuristic' };
}

/* ------------------------------------------------------------------ */
/* SKU matching                                                        */
/* ------------------------------------------------------------------ */

export interface SkuErrorMatch {
  sku: string;
  /** 1-based row numbers in the source document that carry this SKU. */
  rows: number[];
  errors: AmazonReportedError[];
}

export interface UnmatchedError {
  error: AmazonReportedError;
  reason: 'no-sku-in-report' | 'sku-not-in-source-file';
}

export interface SkuMatchResult {
  matches: SkuErrorMatch[];
  unmatched: UnmatchedError[];
  /**
   * The physical source rows each reported error maps to, keyed by the error.
   * Empty for an error that could not be matched.
   */
  rowsByError: Map<string, number[]>;
}

/**
 * Matches reported errors to the rows of the source file by SKU.
 *
 * The source row numbering follows the document: row 1 is the header, so the
 * first data row is row 2.
 */
export function matchErrorsToSource(
  errors: AmazonReportedError[],
  skuColumnIndex: number,
  sourceRows: string[][],
  physicalRecords?: number[],
): SkuMatchResult {
  const rowBySku = new Map<string, number[]>();
  sourceRows.forEach((row, index) => {
    const raw = row[skuColumnIndex];
    if (raw === undefined) return;
    const sku = raw.trim().toLowerCase();
    if (!sku) return;
    const rows = rowBySku.get(sku) ?? [];
    // The physical record of the source, which is not the normalised index
    // when the source has instruction rows above its header.
    rows.push(physicalRecords ? physicalRecords[index] : index + 2);
    rowBySku.set(sku, rows);
  });

  const bySku = new Map<string, AmazonReportedError[]>();
  const unmatched: UnmatchedError[] = [];

  for (const error of errors) {
    if (!error.sku) {
      unmatched.push({ error, reason: 'no-sku-in-report' });
      continue;
    }
    const key = error.sku.trim().toLowerCase();
    const list = bySku.get(key) ?? [];
    list.push(error);
    bySku.set(key, list);
  }

  const matches: SkuErrorMatch[] = [];
  const rowsByError = new Map<string, number[]>();
  for (const [sku, skuErrors] of bySku) {
    const rows = rowBySku.get(sku);
    if (!rows || !rows.length) {
      for (const error of skuErrors) unmatched.push({ error, reason: 'sku-not-in-source-file' });
      continue;
    }
    for (const error of skuErrors) rowsByError.set(errorKey(error), rows);
    matches.push({ sku: errorSkuLabel(skuErrors, sku), rows, errors: skuErrors });
  }

  matches.sort((a, b) => a.rows[0] - b.rows[0]);
  return { matches, unmatched, rowsByError };
}

function errorSkuLabel(errors: AmazonReportedError[], fallback: string): string {
  const withSku = errors.find((e) => e.sku);
  return withSku?.sku ?? fallback;
}

/* ------------------------------------------------------------------ */
/* Grouping                                                            */
/* ------------------------------------------------------------------ */

export type ErrorPriority = 'critical' | 'high' | 'medium' | 'low';

export interface SkuBreakdown {
  sku: string | null;
  affectedRows: number;
  messages: string[];
}

export interface ErrorGroup {
  key: string;
  origin: ErrorOrigin;
  /** Only set for Amazon-reported errors, and only from the source document. */
  errorCode: string | null;
  /** The column the group applies to, when one is known. */
  column: string | null;
  /** ListingAI's own heuristic classification. */
  category: ErrorCategory;
  rootCause: string;
  affectedRows: number;
  /** Every SKU affected by this group. */
  affectedSkus: string[];
  /** Per-SKU breakdown of the same group. */
  bySku: SkuBreakdown[];
  /** Rows in the source file that this group maps to, when they could be matched. */
  sourceRows: number[];
  suggestedCorrection: string;
  severity: 'error' | 'warning';
  priority: ErrorPriority;
  samples: { row: number | null; message: string }[];
}

export interface SourceFinding {
  row: number;
  field: string;
  code: string;
  severity: 'error' | 'warning';
  cause: string;
  detail: string;
  sku?: string | null;
}

const CORRECTION_HINTS: Record<string, string> = {
  ROW_WIDTH: 'Make the row have the same number of cells as the header row.',
  FORMULA_RISK: 'Replace the leading =, +, - or @ character with a literal value.',
  FORMULA_CELL: 'Replace the Excel formula with a static value; the formula was not evaluated here.',
  FORMULA_CACHED: 'Review the formula: the value stored in the file was used, the formula was not evaluated.',
  MALICIOUS_CELL: 'Remove the hidden or control characters from this cell.',
  MISSING_SKU: 'Supply the missing SKU value.',
  MISSING_TITLE: 'Supply the missing title value.',
  PRICE_FORMAT: 'Use a plain decimal number without currency symbols.',
  QUANTITY_FORMAT: 'Use a whole number for the available quantity.',
  DUPLICATE_SKU: 'Confirm the duplicate is an intended variation parent/child relationship.',
  TITLE_LENGTH: 'Shorten the title if the category allows it.',
  EDGE_WHITESPACE: 'Remove the leading or trailing spaces.',
  BLANK_ROW: 'Remove the blank row.',
  MISSING_VALUE: 'Supply a value for this required column.',
};

const PRIORITY_RANK: Record<ErrorPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function priorityFor(severity: 'error' | 'warning', affectedRows: number): ErrorPriority {
  if (severity === 'error') return affectedRows >= 5 ? 'critical' : 'high';
  return affectedRows >= 5 ? 'medium' : 'low';
}

export interface GroupingOptions {
  /** Rows in the source file that each Amazon error maps to, keyed by error key. */
  amazonSourceRows?: Map<string, number[]>;
}

/**
 * Groups source-file findings and Amazon-reported errors into one list.
 * The two origins stay separate: a local finding never receives an Amazon
 * error code, and an Amazon error never receives a locally invented code.
 */
export function groupErrors(
  sourceFindings: SourceFinding[],
  amazonErrors: AmazonReportedError[] = [],
  options: GroupingOptions = {},
): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>();

  const add = (group: ErrorGroup) => {
    const existing = groups.get(group.key);
    if (!existing) {
      groups.set(group.key, group);
      return;
    }
    existing.affectedRows += group.affectedRows;
    for (const sku of group.affectedSkus) {
      if (!existing.affectedSkus.includes(sku)) existing.affectedSkus.push(sku);
    }
    for (const row of group.sourceRows) {
      if (!existing.sourceRows.includes(row)) existing.sourceRows.push(row);
    }
    for (const breakdown of group.bySku) {
      const match = existing.bySku.find((b) => b.sku === breakdown.sku);
      if (match) {
        match.affectedRows += breakdown.affectedRows;
        match.messages.push(...breakdown.messages);
      } else {
        existing.bySku.push({ ...breakdown, messages: [...breakdown.messages] });
      }
    }
    existing.samples.push(...group.samples);
    if (group.severity === 'error') existing.severity = 'error';
  };

  for (const finding of sourceFindings) {
    const key = `source|${finding.code}|${finding.field}`;
    add({
      key,
      origin: 'source-file',
      errorCode: null,
      column: finding.field,
      category: 'format',
      rootCause: finding.cause,
      affectedRows: 1,
      affectedSkus: finding.sku ? [finding.sku] : [],
      bySku: [{ sku: finding.sku ?? null, affectedRows: 1, messages: [finding.detail] }],
      sourceRows: [finding.row],
      suggestedCorrection: CORRECTION_HINTS[finding.code] ?? 'Review the flagged value against the official template.',
      severity: finding.severity,
      priority: priorityFor(finding.severity, 1),
      samples: [{ row: finding.row, message: finding.detail }],
    });
  }

  for (const error of amazonErrors) {
    const code = error.errorCode ?? 'no-code';
    const classification = classifyError(error);
    const key = `amazon|${code}|${error.column ?? '*'}|${classification.category}`;
    const sourceRows = options.amazonSourceRows?.get(errorKey(error)) ?? [];
    add({
      key,
      origin: 'amazon-reported',
      errorCode: error.errorCode,
      column: error.column,
      category: classification.category,
      rootCause: error.errorCode
        ? `Amazon error ${error.errorCode}`
        : 'Amazon processing error without a code',
      affectedRows: 1,
      affectedSkus: error.sku ? [error.sku] : [],
      bySku: [{ sku: error.sku, affectedRows: 1, messages: [error.message] }],
      sourceRows,
      suggestedCorrection: 'See the source processing report for the required remediation.',
      severity: error.severity,
      priority: priorityFor(error.severity, 1),
      samples: [{ row: null, message: error.message }],
    });
  }

  // Recompute the priority from the final affected-row count.
  for (const group of groups.values()) {
    group.priority = priorityFor(group.severity, group.affectedRows);
  }

  return Array.from(groups.values()).sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      b.affectedRows - a.affectedRows ||
      a.key.localeCompare(b.key),
  );
}

/** Stable key for an Amazon error, used to attach matched source rows. */
export function errorKey(error: AmazonReportedError): string {
  return `${error.errorCode ?? 'no-code'}|${error.sku ?? ''}|${error.column ?? ''}|${error.message}`;
}

/* ------------------------------------------------------------------ */
/* Adapter: generic JSON processing report                             */
/* ------------------------------------------------------------------ */

const asString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

/**
 * Reads a JSON document shaped like a flat list of processing errors:
 * `{ "errors": [ { "errorCode": "...", "message": "...", "sku": "..." } ] }`
 * or a bare array of such records.
 *
 * The adapter copies values verbatim. It does not derive an error code when
 * the document does not contain one, and it does not classify a record as an
 * Amazon error unless the document is presented as a processing report.
 */
export const jsonProcessingReportAdapter: AmazonReportAdapter = {
  id: 'json-processing-report',
  label: 'JSON processing report',
  description:
    'Reads a JSON document containing a list of processing errors with optional errorCode, message, sku and column fields.',
  validatedAgainstAmazonOutput: false,
  parse(input: unknown): AmazonProcessingReport | null {
    let records: unknown[] | null = null;

    if (Array.isArray(input)) {
      records = input;
    } else if (input && typeof input === 'object') {
      const container = input as Record<string, unknown>;
      for (const key of ['errors', 'messages', 'report', 'results', 'items']) {
        if (Array.isArray(container[key])) {
          records = container[key] as unknown[];
          break;
        }
      }
    }

    if (!records) return null;
    if (records.length > MAX_REPORT_RECORDS) {
      throw new Error(
        'This processing report contains ' + records.length + ' records, more than the ' + MAX_REPORT_RECORDS + ' that can be read. It was not used.',
      );
    }

    const errors: AmazonReportedError[] = [];
    for (const record of records) {
      if (!record || typeof record !== 'object') continue;
      const r = record as Record<string, unknown>;
      const message =
        asString(r.message) ?? asString(r.errorMessage) ?? asString(r.error) ?? asString(r.description);
      if (!message) continue;
      if (message.length > MAX_REPORT_MESSAGE_CHARS) {
        throw new Error(
          'This processing report contains an error message longer than ' + MAX_REPORT_MESSAGE_CHARS + ' characters. It was not used.',
        );
      }
      errors.push({
        errorCode: asString(r.errorCode) ?? asString(r.code) ?? asString(r.error_code),
        message,
        sku: asString(r.sku) ?? asString(r.sellerSku) ?? asString(r.seller_sku) ?? asString(r.itemSku),
        column: asString(r.column) ?? asString(r.field) ?? asString(r.attribute),
        severity: r.severity === 'warning' || r.severity === 'info' ? 'warning' : 'error',
        raw: record,
      });
    }

    if (!errors.length) return null;

    return {
      origin: 'amazon-reported',
      adapterId: jsonProcessingReportAdapter.id,
      validatedAgainstAmazonOutput: false,
      errors,
      notes: [
        'This adapter has not been validated against genuine Amazon output. Codes are shown exactly as they appear in the supplied document.',
      ],
    };
  },
};

export const AMAZON_REPORT_ADAPTERS: AmazonReportAdapter[] = [
  jsonProcessingReportAdapter,
  textProcessingReportAdapter,
];

/**
 * Tries each adapter against the document. The first adapter that recognises
 * the shape wins. Returns null when no adapter recognises it.
 */
export function parseAmazonReport(input: unknown): AmazonProcessingReport | null {
  for (const adapter of AMAZON_REPORT_ADAPTERS) {
    const report = adapter.parse(input);
    if (report) return report;
  }
  return null;
}
