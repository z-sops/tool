/**
 * The source document model (ListingAI M1b corrections C1 and C8).
 *
 * The original file and the analysis view are kept strictly apart.
 *
 *  - The original file is never modified. It is downloaded byte for byte from
 *    the bytes the seller selected.
 *  - The analysis view is a normalised table: detected headers, the data rows
 *    below them, and the mapping back to the physical source records.
 *  - Every source record above the header (instruction rows) is kept, so an
 *    export never silently drops them.
 *  - When the source could not be represented completely, the table is marked
 *    lossy and a corrected export is refused rather than quietly truncated.
 */

export type SourceKind = 'csv' | 'xlsx-sheet';

export interface AnalyzedTable {
  kind: SourceKind;
  /**
   * A fingerprint of the source content. An approval is bound to this value,
   * so an approval given for one file can never be reused for another.
   */
  documentId: string;
  /** The detected column headers. */
  headers: string[];
  /** The normalised data rows below the header. */
  rows: string[][];
  /** 1-based physical record number of the detected header. */
  headerRecord: number;
  /** Records above the header. Preserved so an export never drops them. */
  instructionRecords: string[][];
  /**
   * physicalRecords[i] is the 1-based physical record number of rows[i] in the
   * source file or worksheet.
   */
  physicalRecords: number[];
  /** Physical records of the source that the analysis could not represent. */
  droppedRecords: number;
  /** Physical columns of the source that the analysis could not represent. */
  droppedColumns: number;
  /** True when the source could not be represented completely. */
  lossy: boolean;
  /** Worksheet name, for a workbook source. */
  sheetName?: string;
  /** How many worksheets the workbook contains. */
  sheetCount?: number;
  /** Records present in the whole worksheet, including instruction rows. */
  sheetRecords?: number;
}

export interface SourceMeta {
  sheetName?: string;
  sheetCount?: number;
  /** Records present in the whole source, including instruction rows. */
  sheetRecords?: number;
  /** Records present in the source that were not represented. */
  droppedRecords?: number;
  /** Columns present in the source that were not represented. */
  droppedColumns?: number;
}

/**
 * Builds the analysis view from a grid of records.
 *
 * `grid` holds every record of the source in order, starting with the first.
 * `headerIndex` is the zero-based index of the record that holds the column
 * headers.
 */
/** A short, stable fingerprint of the source content. */
export function fingerprintSource(grid: string[][]): string {
  let hash = 0x811c9dc5;
  for (const row of grid) {
    for (const cell of row) {
      for (let i = 0; i < cell.length; i++) {
        hash ^= cell.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
      }
      hash ^= 0x1f;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    hash ^= 0x1e;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function buildAnalyzedTable(
  grid: string[][],
  headerIndex: number,
  kind: SourceKind,
  meta: SourceMeta = {},
): AnalyzedTable {
  const header = grid[headerIndex] ?? [];
  const rows = grid.slice(headerIndex + 1);
  const instructionRecords = grid.slice(0, headerIndex);
  const physicalRecords = rows.map((_, index) => headerIndex + 2 + index);
  const droppedRecords = meta.droppedRecords ?? 0;
  const droppedColumns = meta.droppedColumns ?? 0;

  return {
    kind,
    documentId: fingerprintSource(grid),
    headers: header,
    rows,
    headerRecord: headerIndex + 1,
    instructionRecords,
    physicalRecords,
    droppedRecords,
    droppedColumns,
    lossy: droppedRecords > 0 || droppedColumns > 0,
    sheetName: meta.sheetName,
    sheetCount: meta.sheetCount,
    sheetRecords: meta.sheetRecords ?? grid.length,
  };
}

/* ------------------------------------------------------------------ */
/* Export integrity                                                     */
/* ------------------------------------------------------------------ */

export type ExportKind =
  /** Every record and column of the source is present, including instruction rows. */
  | 'source-complete-csv'
  /** A derived export of one worksheet. Other worksheets and workbook formatting are not included. */
  | 'derived-sheet-csv'
  /** Refused, because completeness cannot be established. */
  | 'blocked';

export interface ExportPlan {
  kind: ExportKind;
  allowed: boolean;
  /** Plain-language statements the user must see about what the export contains. */
  caveats: string[];
  /** Why the export was refused. */
  reason?: string;
}

/**
 * Decides what a corrected export may claim.
 *
 * A corrected export is refused outright when the source could not be read
 * completely, because a seller must never receive a file that quietly lost
 * rows. A workbook export is explicitly a derived export of the selected
 * worksheet: it never claims to preserve the workbook or the Amazon template.
 */
export function planExport(table: AnalyzedTable): ExportPlan {
  if (table.lossy) {
    const parts: string[] = [];
    if (table.droppedRecords > 0) {
      parts.push(table.droppedRecords + ' row(s) of the source could not be read');
    }
    if (table.droppedColumns > 0) {
      parts.push(table.droppedColumns + ' column(s) of the source could not be read');
    }
    return {
      kind: 'blocked',
      allowed: false,
      caveats: [],
      reason:
        'A corrected export was refused because the source could not be read completely (' +
        parts.join(' and ') +
        '). Exporting now would silently lose data. The original file is unchanged and can be downloaded below.',
    };
  }

  if (table.kind === 'xlsx-sheet') {
    const other = Math.max(0, (table.sheetCount ?? 1) - 1);
    const caveats = [
      'This is a derived CSV of the worksheet "' + (table.sheetName ?? 'selected sheet') + '". It is not a copy of the workbook.',
      'Cell formatting, colours, column widths, merged cells and Excel formulas are not represented in a CSV export.',
      'The Amazon template structure of the workbook is not preserved. A flat-file template upload may still reject this file.',
    ];
    if (other > 0) {
      caveats.push('The workbook contains ' + other + ' other worksheet(s) that are not included in this export.');
    }
    caveats.push('The original workbook is unchanged and can be downloaded below.');
    return { kind: 'derived-sheet-csv', allowed: true, caveats };
  }

  return {
    kind: 'source-complete-csv',
    allowed: true,
    caveats: [
      'Every record and column of the source file is included, including any instruction rows above the header.',
      'Line endings and cell quoting are normalised, so the file is not byte identical to the original.',
      'The original file is unchanged and can be downloaded below.',
    ],
  };
}

/** The records an export contains, in source order. */
export function exportRecords(table: AnalyzedTable, rows: string[][]): string[][] {
  return [...table.instructionRecords, table.headers, ...rows];
}
