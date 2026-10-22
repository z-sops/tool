// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import {
  buildAnalyzedTable,
  createAnalyzedTable,
  computeContentId,
  computeScopeId,
  validateTableCoordinates,
  buildExportPayload,
  planExport,
  newUploadId,
  type SourceMeta,
} from '../../src/lib/bulk/source';
import { matchErrorsToSource } from '../../src/lib/bulk/amazon-errors';
import { planCorrections, applyCorrections } from '../../src/lib/bulk/corrections';
import { detectHeaderRow } from '../../src/lib/bulk/header';
import { parseWorkbook } from '../../src/lib/bulk/xlsx';
import { collectWorksheetIssues } from '../../src/lib/bulk/worksheet';
import {
  captureReportBinding,
  isReportBindingCurrent,
  reconcileReport,
} from '../../src/lib/bulk/report-binding';
import { parseAmazonReport } from '../../src/lib/bulk/amazon-errors';

/** The separator characters the pre-R3 serialisation joined cells and rows with. */
const CELL_SEP = String.fromCharCode(0);
const ROW_SEP = String.fromCharCode(1);

/**
 * A sparse worksheet: an instruction row at Excel row 1, the real column
 * headers at Excel row 5 and the data at Excel row 9. The file omits the blank
 * rows in between, so the reader carries three rows for a sheet that has nine
 * row positions.
 */
const SPARSE_ROW_NUMBERS = [1, 5, 9];

/** The rows the sparse worksheet carried, in the order the file held them. */
const SPARSE_GRID = [
  ['Instructions'],
  ['seller-sku', 'item-name'],
  ['A-1', 'Widget'],
];

/** Builds a workbook whose worksheet carries the given rows at the given rows. */
function buildSparseXlsx(rowNumbers: number[], rows: string[][]): Uint8Array {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const colName = (i: number) => {
    let name = '';
    let n = i;
    do {
      name = String.fromCharCode(65 + (n % 26)) + name;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return name;
  };
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => {
          const ref = colName(colIndex) + String(rowNumbers[rowIndex]);
          if (value === '') return `<c r="${ref}"/>`;
          return `<c r="${ref}" t="inlineStr"><is><t>${esc(value)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowNumbers[rowIndex]}">${cells}</row>`;
    })
    .join('');
  return zipSync({
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Listings" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
    ),
  });
}

/** Reads a sparse workbook and builds the analysed table for its worksheet. */
async function analyzeSparseWorkbook(rowNumbers: number[], rows: string[][]) {
  const bytes = buildSparseXlsx(rowNumbers, rows);
  const workbook = await parseWorkbook(bytes);
  const sheet = workbook.sheets[0];
  const grid = sheet.rows.map((row) => row.map((cell) => cell.value));
  const detection = detectHeaderRow(grid);
  const headerIndex = detection ? detection.headerRowIndex : 0;
  const table = await createAnalyzedTable(grid, headerIndex, 'xlsx-sheet', {
    sheetName: sheet.name,
    sheetCount: workbook.sheets.length,
    sheetRecords: sheet.physicalRowCount,
    headerRecord: sheet.rowNumbers[headerIndex],
    instructionRecordsPhysical: sheet.rowNumbers.slice(0, headerIndex),
    physicalRecords: sheet.rowNumbers.slice(headerIndex + 1),
    uploadId: 'upload-1',
    worksheetId: '0:Listings',
  });
  return { sheet, grid, headerIndex, table };
}

/* ------------------------------------------------------------------ */
/* R3-2: physical coordinates                                           */
/* ------------------------------------------------------------------ */

describe('R3-2: physical row coordinates', () => {
  it('reports the header at its physical worksheet row, not at index + 1', async () => {
    const { table } = await analyzeSparseWorkbook(SPARSE_ROW_NUMBERS, SPARSE_GRID);
    // The header is the second row the file carried, but it sits at Excel row 5.
    expect(table.headerRecord).toBe(5);
  });

  it('keeps the physical row of every instruction record and data row', async () => {
    const { table } = await analyzeSparseWorkbook(SPARSE_ROW_NUMBERS, SPARSE_GRID);
    expect(table.instructionRecordsPhysical).toEqual([1]);
    expect(table.physicalRecords).toEqual([9]);
  });

  it('keeps the instruction row at its own coordinate when it is not row 1', async () => {
    const { table } = await analyzeSparseWorkbook([3, 5, 9], SPARSE_GRID);
    expect(table.instructionRecordsPhysical).toEqual([3]);
    expect(table.headerRecord).toBe(5);
    expect(table.physicalRecords).toEqual([9]);
  });

  it('reports a data issue at the physical worksheet row', async () => {
    const { sheet, headerIndex } = await analyzeSparseWorkbook(SPARSE_ROW_NUMBERS, SPARSE_GRID);
    const issues = collectWorksheetIssues(sheet, headerIndex);
    // A formula in the data row is reported at Excel row 9.
    const withFormula = collectWorksheetIssues(
      { ...sheet, rows: [sheet.rows[0], sheet.rows[1], sheet.rows[2].map((c) => ({ ...c, formula: '1+1' }))] },
      headerIndex,
    );
    expect(withFormula.find((i) => i.code === 'FORMULA_CACHED')?.row).toBe(9);
    expect(issues.length).toBeGreaterThanOrEqual(0);
  });

  it('reports an instruction-row issue at the instruction row', async () => {
    const { sheet, headerIndex } = await analyzeSparseWorkbook(SPARSE_ROW_NUMBERS, SPARSE_GRID);
    // The reader marks a cell that hides text with a content risk.
    const riskyInstruction: typeof sheet.rows[number] = [
      {
        value: 'Widget\u202Eexe',
        hasCachedValue: true,
        rowNumber: 1,
        columnIndex: 0,
        risk: 'bidi-override',
      },
    ];
    const issues = collectWorksheetIssues({ ...sheet, rows: [riskyInstruction, ...sheet.rows.slice(1)] }, headerIndex);
    const finding = issues.find((i) => i.code === 'MALICIOUS_CELL');
    expect(finding?.row).toBe(1);
  });

  it('matches a reported SKU to the physical worksheet row', async () => {
    const { table } = await analyzeSparseWorkbook(SPARSE_ROW_NUMBERS, SPARSE_GRID);
    const errors = parseAmazonReport({ errors: [{ message: 'invalid', sku: 'A-1' }] })!.errors;
    const result = matchErrorsToSource(errors, 0, table.rows, table.physicalRecords);
    expect(result.matches[0].rows).toEqual([9]);
  });

  it('previews a correction against the physical worksheet row', async () => {
    const { table } = await analyzeSparseWorkbook(
      SPARSE_ROW_NUMBERS,
      [['Instructions'], ['seller-sku', 'item-name'], ['A-1', '  Widget  ']],
    );
    const plan = planCorrections(table, { 0: 'sku', 1: 'title' });
    expect(plan.corrections[0].record).toBe(9);
  });

  it('keeps the physical provenance of every exported record', async () => {
    const { table } = await analyzeSparseWorkbook(SPARSE_ROW_NUMBERS, SPARSE_GRID);
    const payload = buildExportPayload(table, table.rows);
    expect(payload.recordNumbers).toEqual([1, 5, 9]);
    expect(payload.records).toHaveLength(3);
  });

  it('reads a worksheet whose rows are omitted or out of order in the XML', async () => {
    const bytes = buildSparseXlsx([9, 1, 5], [
      ['A-1', 'Widget'],
      ['Instructions'],
      ['seller-sku', 'item-name'],
    ]);
    const workbook = await parseWorkbook(bytes);
    const sheet = workbook.sheets[0];
    // The reader orders the rows by their physical coordinate.
    expect(sheet.rowNumbers).toEqual([1, 5, 9]);
    expect(sheet.physicalRowCount).toBe(9);
  });

  it('keeps conventional CSV records sequential', () => {
    const table = buildAnalyzedTable(
      [['Instructions'], ['seller-sku', 'item-name'], ['A-1', 'Widget']],
      1,
      'csv',
      { documentId: 'csv-1' },
    );
    expect(table.headerRecord).toBe(2);
    expect(table.instructionRecordsPhysical).toEqual([1]);
    expect(table.physicalRecords).toEqual([3]);
  });

  it('refuses an export whose physical mapping is inconsistent', () => {
    const table = buildAnalyzedTable(SPARSE_GRID, 1, 'xlsx-sheet', {
      documentId: 'broken',
      headerRecord: 5,
      instructionRecordsPhysical: [1],
      // The data row says 2, which is not below the header.
      physicalRecords: [2],
    } as unknown as SourceMeta);
    expect(validateTableCoordinates(table)).toMatch(/not below the header/);
    expect(planExport(table).allowed).toBe(false);
    expect(() => buildExportPayload(table, table.rows)).toThrow(/row positions/);
  });

  it('refuses a mapping that does not cover every row', () => {
    const table = buildAnalyzedTable(SPARSE_GRID, 1, 'xlsx-sheet', {
      documentId: 'broken',
      headerRecord: 5,
      instructionRecordsPhysical: [1],
      physicalRecords: [],
    } as unknown as SourceMeta);
    expect(validateTableCoordinates(table)).toMatch(/every data row/);
  });

  it('refuses to match reported errors against an incomplete mapping', () => {
    const errors = parseAmazonReport({ errors: [{ message: 'invalid', sku: 'A-1' }] })!.errors;
    expect(() => matchErrorsToSource(errors, 0, [['A-1', 'Widget']], [])).toThrow(/cannot be located/);
  });

  it('refuses a correction whose physical row cannot be established', () => {
    const table = buildAnalyzedTable(SPARSE_GRID, 1, 'xlsx-sheet', {
      documentId: 'broken',
      headerRecord: 5,
      instructionRecordsPhysical: [1],
      physicalRecords: [],
    } as unknown as SourceMeta);
    const roles = { 0: 'sku', 1: 'title' };
    const plan = planCorrections(table, roles);
    // No correction is proposed for a row whose position is unknown.
    expect(plan.corrections).toHaveLength(0);
    expect(plan.skipped[0].reason).toMatch(/physical row/);
  });
});

/* ------------------------------------------------------------------ */
/* R3-3: unambiguous document identity                                  */
/* ------------------------------------------------------------------ */

describe('R3-3: unambiguous document identity', () => {
  it('gives a cell holding the cell separator a different identity from two cells', async () => {
    const oneCell = await computeContentId([['a' + CELL_SEP + 'b']]);
    const twoCells = await computeContentId([['a', 'b']]);
    expect(oneCell).not.toBe(twoCells);
  });

  it('gives a record holding the row separator a different identity from two records', async () => {
    const oneRecord = await computeContentId([['x' + ROW_SEP + 'y']]);
    const twoRecords = await computeContentId([['x'], ['y']]);
    expect(oneRecord).not.toBe(twoRecords);
  });

  it('gives a cell holding the row separator a different identity from two cells', async () => {
    const oneCell = await computeContentId([['x' + ROW_SEP + 'y']]);
    const twoCells = await computeContentId([['x', 'y']]);
    expect(oneCell).not.toBe(twoCells);
  });

  it('gives different column structures different identities', async () => {
    const twoColumns = await computeContentId([['a', 'b']]);
    const oneColumn = await computeContentId([['a']]);
    expect(twoColumns).not.toBe(oneColumn);
  });

  it('gives changed content a different identity', async () => {
    const before = await computeContentId([['seller-sku'], ['A-1']]);
    const after = await computeContentId([['seller-sku'], ['A-2']]);
    expect(before).not.toBe(after);
  });

  it('gives genuinely identical structures the same identity', async () => {
    const first = await computeContentId([['seller-sku', 'item-name'], ['A-1', 'Widget']]);
    const second = await computeContentId([['seller-sku', 'item-name'], ['A-1', 'Widget']]);
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives the same content in a different upload a different scoped identity', async () => {
    const contentId = await computeContentId([['seller-sku'], ['A-1']]);
    const first = await computeScopeId(contentId, { uploadId: 'upload-1', worksheetId: '0:Listings' });
    const second = await computeScopeId(contentId, { uploadId: 'upload-2', worksheetId: '0:Listings' });
    expect(first).not.toBe(second);
    // The content identity itself is a property of the content and is shared.
    expect(contentId).toBe(await computeContentId([['seller-sku'], ['A-1']]));
  });

  it('gives the same content on a different worksheet a different scoped identity', async () => {
    const contentId = await computeContentId([['seller-sku'], ['A-1']]);
    const first = await computeScopeId(contentId, { uploadId: 'upload-1', worksheetId: '0:Listings' });
    const second = await computeScopeId(contentId, { uploadId: 'upload-1', worksheetId: '1:Notes' });
    expect(first).not.toBe(second);
  });

  it('produces no scoped identity when the scope is incomplete', async () => {
    const contentId = await computeContentId([['seller-sku'], ['A-1']]);
    expect(await computeScopeId(contentId, { uploadId: '', worksheetId: '0:Listings' })).toBe('');
    expect(await computeScopeId(contentId, { uploadId: 'upload-1', worksheetId: '' })).toBe('');
    expect(await computeScopeId('', { uploadId: 'upload-1', worksheetId: '0:Listings' })).toBe('');
  });

  it('produces a different upload identity for every upload', () => {
    const first = newUploadId();
    const second = newUploadId();
    expect(first).not.toBe('');
    expect(first).not.toBe(second);
  });

  it('binds a table to its upload and worksheet', async () => {
    const grid = [['seller-sku', 'item-name'], ['A-1', 'Widget']];
    const first = await createAnalyzedTable(grid, 0, 'csv', { uploadId: 'upload-1', worksheetId: 'csv' });
    const second = await createAnalyzedTable(grid, 0, 'csv', { uploadId: 'upload-2', worksheetId: 'csv' });
    expect(first.documentId).not.toBe(second.documentId);
    // The content identity is a property of the content, so it is shared.
    expect(first.contentId).toBe(second.contentId);
    expect(first.documentId).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses corrections for a table without a scoped identity', async () => {
    const grid = [['item-name'], ['  Widget  ']];
    const table = await createAnalyzedTable(grid, 0, 'csv', { uploadId: '', worksheetId: '' });
    expect(table.documentId).toBe('');
    expect(table.identityUnavailable).toBeDefined();
    const plan = planCorrections(table, { 0: 'title' });
    expect(plan.corrections).toHaveLength(0);
    expect(() => applyCorrections(table, { 0: 'title' }, [], [])).toThrow(/no secure document fingerprint/);
  });
});

/* ------------------------------------------------------------------ */
/* R3-1: processing report bound to the source and worksheet            */
/* ------------------------------------------------------------------ */

describe('R3-1: processing-report binding', () => {
  const report = parseAmazonReport({ errors: [{ message: 'invalid', sku: 'A-1' }] })!;

  it('treats an import as current while the source and worksheet are unchanged', () => {
    const binding = captureReportBinding(7, 3);
    expect(isReportBindingCurrent(binding, { fileOp: 7, sheetOp: 3 })).toBe(true);
  });

  it('treats an import as stale after the worksheet changed', () => {
    const binding = captureReportBinding(7, 3);
    expect(isReportBindingCurrent(binding, { fileOp: 7, sheetOp: 4 })).toBe(false);
  });

  it('treats an import as stale after the source changed', () => {
    const binding = captureReportBinding(7, 3);
    expect(isReportBindingCurrent(binding, { fileOp: 8, sheetOp: 3 })).toBe(false);
  });

  it('reconciles a report against the table it is given, never against another', async () => {
    const sheetA = buildAnalyzedTable([['seller-sku'], ['A-1']], 0, 'csv', {
      documentId: 'a',
      physicalRecords: [2],
    });
    const sheetB = buildAnalyzedTable([['seller-sku'], ['A-1']], 0, 'csv', {
      documentId: 'b',
      physicalRecords: [5],
    });

    const forA = reconcileReport(sheetA, report);
    expect(forA.matches[0].rows).toEqual([2]);

    // The same report against another table is matched again, not reused.
    const forB = reconcileReport(sheetB, report);
    expect(forB.matches[0].rows).toEqual([5]);
    expect(forB.matches).not.toBe(forA.matches);
  });

  it('reports no match at all when there is no table', () => {
    const result = reconcileReport(null, report);
    expect(result.matches).toHaveLength(0);
    expect(result.rowsByError.size).toBe(0);
  });

  it('keeps reported errors and source findings apart', async () => {
    const table = buildAnalyzedTable([['seller-sku', 'item-name'], ['A-1', 'Widget']], 0, 'csv', {
      documentId: 'a',
      physicalRecords: [2],
    });
    const result = reconcileReport(table, report);
    // The association is a mapping from a reported error to a source row. It
    // does not turn into a finding of the source file.
    expect(result.rowsByError.size).toBe(1);
    expect(result.matches[0].errors[0].message).toBe('invalid');
  });
});
