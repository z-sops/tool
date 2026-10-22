/**
 * The source document model (ListingAI M1b corrections C1, C8 and R2-C1, R2-C5).
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
 *  - The document is identified by a SHA-256 content identifier, so an
 *    approval can never carry over to a different file.
 */

import { isFormulaRisk } from '../file-doctor';

export type SourceKind = 'csv' | 'xlsx-sheet';

export interface AnalyzedTable {
  kind: SourceKind;
  /**
   * A collision-resistant content identifier for the source. An approval is
   * bound to this value, so an approval given for one file can never be
   * reused for another.
   *
   * The empty string means no trustworthy identity could be established. Such
   * a table authorises no correction at all.
   */
  documentId: string;
  /**
   * Why no secure document identity could be established, when that happened.
   * The analysis is still valid; only the corrections are unavailable.
   */
  identityUnavailable?: string;
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
  sheetName?: string;
  /** How many worksheets the workbook contains. */
  sheetCount?: number;
  /** Records present in the whole worksheet, including instruction rows. */
  sheetRecords?: number;
}

export interface SourceMeta {
  /**
   * The content identifier of the source. It must be a cryptographic digest of
   * the source records. An empty value means no identity is available, and no
   * correction may be approved for the table.
   */
  documentId: string;
  sheetName?: string;
  sheetCount?: number;
  /** Records present in the whole source, including instruction rows. */
  sheetRecords?: number;
  /** Physical record numbers of the rows, when they are not simply sequential. */
  physicalRecords?: number[];
  /** Records present in the source that were not represented. */
  droppedRecords?: number;
  /** Columns present in the source that were not represented. */
  droppedColumns?: number;
}

/* ------------------------------------------------------------------ */
/* Document identity                                                    */
/* ------------------------------------------------------------------ */

const HEX = '0123456789abcdef';

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (const byte of bytes) out += HEX[byte >> 4] + HEX[byte & 15];
  return out;
}

/**
 * A SHA-256 content identifier for the source records.
 *
 * This is what an approval is bound to, so it has to be collision resistant.
 * A short non-cryptographic fingerprint is not sufficient here: a 32-bit hash
 * can be collided deliberately, which would let an approval given for one file
 * be replayed against a different one. The fingerprint that used to be used
 * as a fallback has been removed for exactly that reason.
 *
 * When the platform cannot compute a SHA-256 digest there is no usable
 * document identity, and the empty string is returned. An empty identity
 * authorises nothing: `planCorrections` proposes nothing and `applyCorrections`
 * refuses the export. The analysis itself still works.
 */
export async function computeDocumentId(records: string[][]): Promise<string> {
  const payload = records.map((row) => row.join('\u0000')).join('\u0001');
  const bytes = new TextEncoder().encode(payload);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return '';
  try {
    return toHex(await subtle.digest('SHA-256', bytes));
  } catch {
    return '';
  }
}

/**
 * Builds the analysis view and computes the content identifier.
 *
 * The identifier is a SHA-256 digest of the source records. When no secure
 * digest can be computed the table carries no identity, which means no
 * correction can be approved for it.
 */
export async function createAnalyzedTable(
  grid: string[][],
  headerIndex: number,
  kind: SourceKind,
  meta: Omit<SourceMeta, 'documentId'> = {},
): Promise<AnalyzedTable> {
  const documentId = await computeDocumentId(grid);
  const table = buildAnalyzedTable(grid, headerIndex, kind, { ...meta, documentId });
  if (!documentId) {
    table.identityUnavailable =
      'This browser cannot compute a secure SHA-256 fingerprint, so an approval cannot be bound to this file. ' +
      'The analysis below is still accurate; no correction is proposed and no corrected export can be produced.';
  }
  return table;
}

/**
 * Builds the analysis view from a grid of records.
 *
 * `grid` holds every record of the source in order, starting with the first.
 * `headerIndex` is the zero-based index of the record that holds the column
 * headers.
 */
export function buildAnalyzedTable(
  grid: string[][],
  headerIndex: number,
  kind: SourceKind,
  meta: SourceMeta,
): AnalyzedTable {
  const header = grid[headerIndex] ?? [];
  const rows = grid.slice(headerIndex + 1);
  const instructionRecords = grid.slice(0, headerIndex);
  const physicalRecords =
    meta.physicalRecords ?? rows.map((_, index) => headerIndex + 2 + index);
  const droppedRecords = meta.droppedRecords ?? 0;
  const droppedColumns = meta.droppedColumns ?? 0;

  return {
    kind,
    documentId: meta.documentId,
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
/* Export safety                                                        */
/* ------------------------------------------------------------------ */

export type ExportCellRisk = 'formula' | 'hidden-content' | 'control-character';

export interface ExportCellFinding {
  /** 1-based physical record number in the source. */
  record: number;
  /** 1-based column number in the source record. */
  column: number;
  value: string;
  risk: ExportCellRisk;
  reason: string;
}

/** Characters that make a value look empty or hide its real content. */
const INVISIBLE_ONLY = /^[\s\u200B\u200C\u200D\uFEFF\u202A-\u202E\u2066-\u2069]*$/;
const HAS_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
/**
 * Zero-width characters hide text inside an apparently normal value. U+200C and
 * U+200D are legitimate joiners in emoji sequences and are not flagged.
 */
const ZERO_WIDTH = /[\u200B\uFEFF]/;
/**
 * Bidirectional overrides hide the real end of a string, which is the classic
 * title-spoofing trick against a human reviewing a listing.
 */
const BIDI_OVERRIDE = /[\u202A-\u202E\u2066-\u2069]/;

/**
 * Classifies one cell of an export.
 *
 * Every cell that will be written is checked, not only the cells of the
 * normalised analysis table, so a payload in an instruction row or in an
 * unmapped column cannot slip into a corrected export.
 */
export function classifyExportCell(value: string): { risk: ExportCellRisk; reason: string } | null {
  if (isFormulaRisk(value)) {
    return {
      risk: 'formula',
      reason:
        'The value could be evaluated as a formula by a spreadsheet. ' +
        'Spreadsheet programs differ in how they treat a leading "=", "+" or "@", so it is treated as unsafe.',
    };
  }
  if (HAS_CONTROL.test(value)) {
    return {
      risk: 'control-character',
      reason: 'The value contains control characters that can break the file or hide its content.',
    };
  }
  if (ZERO_WIDTH.test(value)) {
    return {
      risk: 'hidden-content',
      reason: 'The value contains zero-width characters that hide text inside an apparently normal value.',
    };
  }
  if (BIDI_OVERRIDE.test(value)) {
    return {
      risk: 'hidden-content',
      reason:
        'The value contains bidirectional override characters, which hide the real end of the text ' +
        'from a human reviewing the listing.',
    };
  }
  if (value.length > 0 && INVISIBLE_ONLY.test(value)) {
    return {
      risk: 'hidden-content',
      reason: 'The value looks empty but contains hidden characters.',
    };
  }
  return null;
}

/**
 * Scans every cell of the records that would be exported.
 *
 * `recordNumbers` gives the physical source record of each exported record, so
 * a finding points at the position in the seller's own file.
 */
export function findUnsafeExportCells(
  records: string[][],
  recordNumbers: number[],
): ExportCellFinding[] {
  const findings: ExportCellFinding[] = [];
  records.forEach((record, recordIndex) => {
    const sourceRecord = recordNumbers[recordIndex] ?? recordIndex + 1;
    // A malformed record is scanned as a single cell rather than crashing the
    // gate: the export must be refused, never silently completed.
    const cells = Array.isArray(record) ? record : [record];
    cells.forEach((value, columnIndex) => {
      if (value === undefined || value === null) return;
      const classification = classifyExportCell(String(value));
      if (!classification) return;
      findings.push({
        record: sourceRecord,
        column: columnIndex + 1,
        value: String(value),
        risk: classification.risk,
        reason: classification.reason,
      });
    });
  });
  return findings;
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

export interface ExportPayload {
  /** The records that will be written, in source order. */
  records: string[][];
  /** The physical source record number of each exported record. */
  recordNumbers: number[];
}

/**
 * The records an export contains, in source order, together with the physical
 * source record each of them came from.
 */
export function buildExportPayload(table: AnalyzedTable, rows: string[][]): ExportPayload {
  const instructionNumbers = table.instructionRecords.map((_, index) => index + 1);
  return {
    records: [...table.instructionRecords, table.headers, ...rows],
    recordNumbers: [...instructionNumbers, table.headerRecord, ...table.physicalRecords],
  };
}

/**
 * Returns all records that would be exported, in source order, including
 * instruction rows, the header row, and the data rows.
 */
export function exportRecords(table: AnalyzedTable, rows: string[][]): string[][] {
  return buildExportPayload(table, rows).records;
}

/* ------------------------------------------------------------------ */
/* The final export gate                                               */
/* ------------------------------------------------------------------ */

export interface ExportGate {
  /** True when the export may be written. */
  allowed: boolean;
  /** Every unsafe cell that was found, including in instruction rows. */
  findings: ExportCellFinding[];
  /** Why the export was refused. */
  reason?: string;
}

/**
 * The last gate before a corrected file is written.
 *
 * Every cell that would end up in the file is scanned, not only the cells of
 * the analysis table: an instruction row above the header, a column that was
 * never mapped, and a header cell are all part of the export. A single unsafe
 * cell refuses the whole export, because a seller must never receive a file
 * that carries a payload they did not see.
 */
export function gateExport(payload: ExportPayload): ExportGate {
  const findings = findUnsafeExportCells(payload.records, payload.recordNumbers);
  if (!findings.length) {
    return { allowed: true, findings };
  }

  const first = findings[0];
  const where = 'record ' + first.record + ', column ' + first.column;
  const extra = findings.length > 1 ? ' (' + findings.length + ' cell(s) in total)' : '';
  return {
    allowed: false,
    findings,
    reason:
      'The corrected export was refused because ' + where + ' contains content that a spreadsheet could ' +
      'interpret as something other than text' + extra + '. ' + first.reason +
      ' The original file is unchanged and can be downloaded below.',
  };
}
