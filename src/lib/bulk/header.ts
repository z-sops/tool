/**
 * Header row detection for spreadsheet sources.
 *
 * A workbook or export frequently starts with instruction rows, a title, or a
 * blank spacer row before the real column headers. Assuming row 1 is the
 * header silently mis-maps every column, so the header row is detected and the
 * decision is reported to the user together with the rows that were skipped.
 */

import { normalizeHeader } from './templates';

export interface HeaderDetection {
  /** Zero-based index of the detected header row. */
  headerRowIndex: number;
  /** 0 to 1. */
  confidence: number;
  reason: string;
  /** How many rows above the header were ignored. */
  skippedRows: number;
}

/** Rows above this index are never considered for the header. */
export const MAX_HEADER_SEARCH_ROWS = 25;

/** Headers a seller export is likely to contain. Used only as a hint. */
const HEADER_HINTS = [
  'sku', 'sellersku', 'itemsku', 'msku', 'productsku',
  'itemname', 'title', 'productname', 'producttitle',
  'brandname', 'brand', 'producttype', 'price', 'standardprice',
  'bulletpoint1', 'description', 'productdescription', 'parent-sku', 'parentsku',
];

const isNumeric = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[-+]?[\d.,]+$/.test(trimmed) && /\d/.test(trimmed);
};

/**
 * Scores a candidate header row. Higher is better.
 * Rewards: text-like cells, distinct cell values, known header names,
 * a plausible column count and data rows below the candidate.
 */
function scoreRow(row: string[], columnCount: number, rowsBelow: string[][]): number {
  const cells = row.map((c) => c.trim());
  const filled = cells.filter((c) => c.length > 0);
  if (filled.length === 0) return 0;

  // A row made up entirely of numbers is data, never a column header.
  if (filled.every((c) => isNumeric(c))) return 0;

  const nonEmptyRatio = filled.length / Math.max(cells.length, 1);
  const textRatio = filled.filter((c) => !isNumeric(c)).length / filled.length;
  const uniqueRatio = new Set(filled.map(normalizeHeader)).size / filled.length;
  const hintHits = filled.filter((c) => HEADER_HINTS.includes(normalizeHeader(c))).length;
  const hintRatio = hintHits / filled.length;

  // Rows below should have a similar number of columns.
  let belowScore = 0;
  if (rowsBelow.length) {
    const matching = rowsBelow.filter((r) => r.filter((c) => c.trim()).length === filled.length).length;
    belowScore = matching / rowsBelow.length;
  }

  // A header row with only one or two columns is usually not a header.
  const widthPenalty = filled.length < 2 ? 0.3 : 0;

  const score =
    0.25 * nonEmptyRatio +
    0.25 * textRatio +
    0.2 * uniqueRatio +
    0.2 * hintRatio +
    0.1 * belowScore -
    widthPenalty;

  return Math.max(0, Math.min(1, score));
}

/**
 * Detects the header row. Returns null when no row scores high enough, which
 * the caller must treat as "this file does not look like a tabular listing".
 */
export function detectHeaderRow(rows: string[][], minimumConfidence = 0.5): HeaderDetection | null {
  const limit = Math.min(rows.length, MAX_HEADER_SEARCH_ROWS);
  let best: { index: number; score: number } | null = null;

  for (let i = 0; i < limit; i++) {
    const row = rows[i] ?? [];
    const columnCount = Math.max(row.length, 1);
    const rowsBelow = rows.slice(i + 1, i + 4);
    const score = scoreRow(row, columnCount, rowsBelow);
    if (!best || score > best.score) best = { index: i, score };
  }

  if (!best || best.score < minimumConfidence) return null;

  const row = rows[best.index] ?? [];
  const hintHits = row.filter((c) => HEADER_HINTS.includes(normalizeHeader(c))).length;
  const reason =
    hintHits > 0
      ? `Row ${best.index + 1} contains ${hintHits} recognised listing column name(s).`
      : `Row ${best.index + 1} is the first row with distinct, text-like values in a consistent number of columns.`;

  return {
    headerRowIndex: best.index,
    confidence: Number(best.score.toFixed(3)),
    reason,
    skippedRows: best.index,
  };
}
