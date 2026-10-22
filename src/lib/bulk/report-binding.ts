/**
 * Processing-report binding (ListingAI M1b R3-1).
 *
 * Reading a processing report is asynchronous. While the seller waits for the
 * file to be read they can change the selected worksheet, and the report that
 * was started for the previous worksheet would otherwise finish later and
 * attach its matches to the wrong table.
 *
 * Every import is therefore bound to the source and the worksheet it was
 * started for. An import that is no longer bound to what is on screen is
 * discarded, and the report is reconciled again against the table that is
 * actually shown. Matches are never carried over from a previous table: they
 * are always recomputed from the table they are displayed against.
 */

import { matchErrorsToSource } from './amazon-errors';
import { skuColumnIndex } from './templates';
import type { AmazonProcessingReport, SkuMatchResult } from './amazon-errors';
import type { AnalyzedTable } from './source';

/**
 * The source and worksheet a processing-report import belongs to.
 */
export interface ReportBinding {
  /** The file operation the import was started under. */
  fileOp: number;
  /** The worksheet operation the import was started under. */
  sheetOp: number;
}

/** The source and worksheet that are currently on screen. */
export interface CurrentGeneration {
  fileOp: number;
  sheetOp: number;
}

/**
 * Records the source and worksheet an import belongs to.
 */
export function captureReportBinding(fileOp: number, sheetOp: number): ReportBinding {
  return { fileOp, sheetOp };
}

/**
 * True when the import still belongs to the source and worksheet on screen.
 *
 * A worksheet change bumps the worksheet operation, so an import started for
 * the previous worksheet is no longer current.
 */
export function isReportBindingCurrent(
  binding: ReportBinding,
  current: CurrentGeneration,
): boolean {
  return binding.fileOp === current.fileOp && binding.sheetOp === current.sheetOp;
}

/**
 * Reconciles a parsed processing report against one table.
 *
 * The result is always computed from the table it is given. A report that is
 * still applicable to a new worksheet is therefore reconciled again, and the
 * matches of the previous worksheet are never reused.
 *
 * The errors of the report and the findings of the source file stay apart:
 * this function only produces the association between a reported error and a
 * source row. A reported error is never turned into a source-file finding.
 */
export function reconcileReport(
  table: AnalyzedTable | null,
  parsed: AmazonProcessingReport | null,
): SkuMatchResult {
  const empty: SkuMatchResult = { matches: [], unmatched: [], rowsByError: new Map() };
  if (!table || !parsed) return empty;

  const skuColumn = skuColumnIndex(table.headers);
  if (skuColumn < 0) {
    // The source has no SKU column, so no reported error can be located in it.
    return {
      matches: [],
      unmatched: parsed.errors.map((error) => ({ error, reason: 'no-sku-in-report' as const })),
      rowsByError: new Map(),
    };
  }

  return matchErrorsToSource(parsed.errors, skuColumn, table.rows, table.physicalRecords);
}
