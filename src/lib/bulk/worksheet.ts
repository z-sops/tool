/**
 * Worksheet analysis (ListingAI M1b R3-2).
 *
 * The XLSX reader reports the physical Excel row of every cell it read. The
 * analysis has to carry those coordinates all the way to the screen, because a
 * finding that says "row 2" is only useful to a seller if row 2 is the row
 * their spreadsheet shows.
 *
 * A worksheet may omit blank rows, so the position of a record in the read
 * rows is not its row number. Everything here works from the physical
 * coordinates the reader captured.
 */

import type { Issue } from '../file-doctor';
import type { XlsxSheet } from './xlsx';

/** The plain-language reason for each content risk the reader can report. */
export const RISK_DETAIL: Record<string, string> = {
  'bidi-override': 'The cell contains bidirectional override characters, which can hide text from a human reviewer.',
  'control-character': 'The cell contains control characters that can break a CSV or truncate a value downstream.',
  'zero-width': 'The cell contains zero-width characters that hide text inside an apparently normal value.',
  'too-long': 'The cell is unusually long and was kept as-is.',
};

/**
 * The physical Excel row of a cell, with a fallback for a sheet that states no
 * row coordinates at all.
 */
export function physicalRowOf(sheet: XlsxSheet, rowIndex: number, cellIndex: number): number {
  const row = sheet.rows[rowIndex];
  const cell = row?.[cellIndex];
  if (cell && Number.isInteger(cell.rowNumber) && cell.rowNumber > 0) return cell.rowNumber;
  const stated = sheet.rowNumbers[rowIndex];
  if (Number.isInteger(stated) && stated > 0) return stated;
  return rowIndex + 1;
}

/**
 * Collects the issues a worksheet carries.
 *
 * Every cell of the worksheet is checked, including the instruction rows above
 * the header: a formula hidden in an instruction row is still a formula, and a
 * seller has to be told about it. The row number of a finding is the physical
 * Excel row, so it points at the line of the seller's own workbook.
 *
 * `headerIndex` is the index of the header row among the rows the file
 * carried. Rows before it are instruction rows and are reported under a
 * neutral field name, because a column name does not apply to them.
 */
export function collectWorksheetIssues(sheet: XlsxSheet, headerIndex: number): Issue[] {
  const issues: Issue[] = [];
  const headers = sheet.rows[headerIndex]?.map((cell) => cell.value) ?? [];

  sheet.rows.forEach((row, rowIndex) => {
    const isInstruction = rowIndex < headerIndex;
    row.forEach((cell, colIndex) => {
      const record = physicalRowOf(sheet, rowIndex, colIndex);
      const field = isInstruction
        ? 'instruction-row'
        : headers[colIndex] || 'column-' + (colIndex + 1);

      if (cell.formula !== undefined) {
        if (cell.hasCachedValue) {
          issues.push({
            row: record,
            field,
            code: 'FORMULA_CACHED',
            severity: 'warning',
            cause: 'manual-review',
            detail:
              'The cell contains an Excel formula. The formula was not evaluated; the value stored in the file was used.',
          });
        } else {
          issues.push({
            row: record,
            field,
            code: 'FORMULA_CELL',
            severity: 'error',
            cause: 'manual-review',
            detail: 'The cell contains an Excel formula with no stored result. Replace it with a static value.',
          });
        }
      }

      if (cell.risk) {
        issues.push({
          row: record,
          field,
          code: 'MALICIOUS_CELL',
          severity: cell.risk === 'too-long' ? 'warning' : 'error',
          cause: 'manual-review',
          detail: RISK_DETAIL[cell.risk] ?? 'The cell content was flagged as risky.',
        });
      }
    });
  });

  return issues;
}
