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
   * The content identity of the source records: a SHA-256 digest of their
   * canonical encoding. Two uploads of the same content share this value; it
   * identifies the content and nothing else.
   */
  contentId: string;
  /**
   * The identity an approval is bound to: the content identity combined with
   * the upload generation and the worksheet. An approval given for one upload
   * or one worksheet never authorises another.
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
  /**
   * The physical row number of the detected header.
   *
   * This is the row in the seller's own file, not the position of the header
   * in the analysed rows: a worksheet may omit blank rows, so the header can
   * be at row 5 while only three rows were read.
   */
  headerRecord: number;
  /** Records above the header. Preserved so an export never drops them. */
  instructionRecords: string[][];
  /**
   * The physical row number of each instruction record, parallel to
   * `instructionRecords`.
   */
  instructionRecordsPhysical: number[];
  /**
   * The physical row number of each row in `rows`. `physicalRecords[i]` is the
   * row of `rows[i]` in the source file or worksheet.
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
   * The identity an approval is bound to. It must be a cryptographic digest of
   * the source records and the scope they were read in. An empty value means
   * no identity is available, and no correction may be approved for the table.
   */
  documentId: string;
  /** The content identity of the records, when it is known. */
  contentId?: string;
  sheetName?: string;
  sheetCount?: number;
  /** Records present in the whole source, including instruction rows. */
  sheetRecords?: number;
  /** The physical row number of the header, when it is not simply headerIndex + 1. */
  headerRecord?: number;
  /** The physical row number of each instruction record. */
  instructionRecordsPhysical?: number[];
  /** Physical record numbers of the rows, when they are not simply sequential. */
  physicalRecords?: number[];
  /** Records present in the source that were not represented. */
  droppedRecords?: number;
  /** Columns present in the source that were not represented. */
  droppedColumns?: number;
  /** Identifies the upload the seller selected. */
  uploadId?: string;
  /** Identifies the selected worksheet within that upload. */
  worksheetId?: string;
}

/* ------------------------------------------------------------------ */
/* Document identity                                                    */
/* ------------------------------------------------------------------ */

const HEX = '0123456789abcdef';

/**
 * Identity domains.
 *
 * The domain is part of the hashed bytes, so an identity produced by one
 * scheme can never be confused with an identity produced by another. A future
 * scheme gets its own domain rather than silently replacing this one.
 */
const CONTENT_ID_DOMAIN = 'listingai/content-id/v1';
const SCOPE_ID_DOMAIN = 'listingai/document-id/v1';

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (const byte of bytes) out += HEX[byte >> 4] + HEX[byte & 15];
  return out;
}

/**
 * Encodes a two-dimensional record structure unambiguously.
 *
 * Every record states how many cells it has, and every cell is written with
 * its exact UTF-8 byte length in front of it. The structure's boundaries are
 * therefore part of the encoded bytes rather than implied by a delimiter, so
 * two different structures cannot encode to the same bytes whatever characters
 * a cell happens to contain. A cell holding the delimiter byte is not the
 * same thing as two cells.
 *
 * The encoding is: domain, record count, then for each record the cell count
 * followed by the length-prefixed cells.
 */
function canonicalEncode(domain: string, records: string[][]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const push = (text: string) => chunks.push(encoder.encode(text));

  push(domain);
  push('\n');
  push(String(records.length));
  push('\n');
  for (const row of records) {
    push(String(row.length));
    push('\n');
    for (const cell of row) {
      const bytes = encoder.encode(cell);
      push(String(bytes.length));
      push(':');
      chunks.push(bytes);
      push('\n');
    }
  }

  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/**
 * The content identity of a set of records: a SHA-256 digest of their
 * canonical encoding.
 *
 * This identifies the *content* only. Two uploads of the same file have the
 * same content identity; that is a property of a content digest and is not
 * claimed to be otherwise. What must not travel between uploads is an
 * *approval*, and an approval is bound to the scoped identity below.
 *
 * The empty string is returned when the platform cannot compute a SHA-256
 * digest. An empty identity authorises nothing.
 */
export async function computeContentId(records: string[][]): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return '';
  try {
    return toHex(await subtle.digest('SHA-256', canonicalEncode(CONTENT_ID_DOMAIN, records)));
  } catch {
    return '';
  }
}

/**
 * The scope an approval is bound to.
 */
export interface IdentityScope {
  /** Identifies the upload the seller selected. */
  uploadId: string;
  /** Identifies the selected worksheet within that upload. */
  worksheetId: string;
}

/**
 * The identity an approval is bound to: the content identity plus the scope
 * it was given in.
 *
 * The scope is what stops an approval from carrying over. The content digest
 * alone cannot do that, because the same content legitimately appears in a
 * different upload or on a different worksheet. Adding the upload generation
 * and the worksheet to the hashed bytes means an approval given for one
 * upload or one worksheet never authorises another.
 *
 * The empty string is returned when any part of the scope is missing or when
 * no digest can be computed. An empty identity authorises nothing.
 */
export async function computeScopeId(contentId: string, scope: IdentityScope): Promise<string> {
  if (!contentId) return '';
  if (!scope.uploadId || !scope.worksheetId) return '';
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return '';
  const payload = canonicalEncode(SCOPE_ID_DOMAIN, [
    [scope.uploadId, scope.worksheetId, contentId],
  ]);
  try {
    return toHex(await subtle.digest('SHA-256', payload));
  } catch {
    return '';
  }
}

/**
 * A fresh identifier for one upload of one file.
 *
 * The identifier is only a scope marker: it separates one upload from
 * another. It is random rather than derived, so two uploads of the same file
 * never share it. When no cryptographic randomness is available the empty
 * string is returned, which leaves the upload without a scope and therefore
 * without the ability to approve a correction.
 */
export function newUploadId(): string {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) return '';
  const bytes = new Uint8Array(16);
  cryptoObj.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Builds the analysis view and computes the document identity.
 *
 * The content identity is a SHA-256 digest of the source records. The identity
 * an approval is bound to combines that digest with the upload generation and
 * the worksheet, so an approval never carries over to another upload or
 * another worksheet even when the content is identical.
 *
 * When no secure digest can be computed the table carries no identity, which
 * means no correction can be approved for it.
 */
export async function createAnalyzedTable(
  grid: string[][],
  headerIndex: number,
  kind: SourceKind,
  meta: Omit<SourceMeta, 'documentId'> = {},
): Promise<AnalyzedTable> {
  const contentId = await computeContentId(grid);
  const documentId = await computeScopeId(contentId, {
    uploadId: meta.uploadId ?? '',
    worksheetId: meta.worksheetId ?? '',
  });
  const table = buildAnalyzedTable(grid, headerIndex, kind, { ...meta, documentId, contentId });
  if (!documentId) {
    table.identityUnavailable =
      'This browser cannot establish a secure identity for this file, so an approval cannot be bound to it. ' +
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
 *
 * The physical coordinates in `meta` describe where each record sits in the
 * seller's own file. When they are absent the sequential layout of a
 * conventional CSV record is assumed, which is what a CSV has.
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
  // The physical row of the header. A worksheet may omit blank rows, so the
  // header is not simply the row after the last instruction record.
  const headerRecord = meta.headerRecord ?? headerIndex + 1;
  const instructionRecordsPhysical =
    meta.instructionRecordsPhysical ?? instructionRecords.map((_, index) => index + 1);
  const physicalRecords =
    meta.physicalRecords ?? rows.map((_, index) => headerRecord + 1 + index);
  const droppedRecords = meta.droppedRecords ?? 0;
  const droppedColumns = meta.droppedColumns ?? 0;

  return {
    kind,
    contentId: meta.contentId ?? '',
    documentId: meta.documentId,
    headers: header,
    rows,
    headerRecord,
    instructionRecords,
    instructionRecordsPhysical,
    physicalRecords,
    droppedRecords,
    droppedColumns,
    lossy: droppedRecords > 0 || droppedColumns > 0,
    sheetName: meta.sheetName,
    sheetCount: meta.sheetCount,
    sheetRecords: meta.sheetRecords ?? grid.length,
  };
}

/**
 * Checks that the table's physical coordinate mapping is complete and
 * self-consistent.
 *
 * Returns a reason when it is not, and null when it is. An operation that
 * depends on the mapping must refuse a table that fails this check rather
 * than guess a row number.
 */
export function validateTableCoordinates(table: AnalyzedTable): string | null {
  if (table.physicalRecords.length !== table.rows.length) {
    return 'The physical row mapping does not cover every data row.';
  }
  if (table.instructionRecordsPhysical.length !== table.instructionRecords.length) {
    return 'The physical row mapping does not cover every instruction row.';
  }
  const every = [...table.instructionRecordsPhysical, table.headerRecord, ...table.physicalRecords];
  if (every.some((row) => !Number.isInteger(row) || row < 1)) {
    return 'The physical row mapping contains an invalid row number.';
  }
  if (table.instructionRecordsPhysical.some((row) => row >= table.headerRecord)) {
    return 'An instruction row is not above the header.';
  }
  if (table.physicalRecords.some((row) => row <= table.headerRecord)) {
    return 'A data row is not below the header.';
  }
  const inOrder = (rows: number[]) => rows.every((row, index) => index === 0 || row > rows[index - 1]);
  if (!inOrder(table.instructionRecordsPhysical) || !inOrder(table.physicalRecords)) {
    return 'The physical row mapping is not in source order.';
  }
  return null;
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

  // The export carries the physical row of every record it writes, so a
  // finding can point at the seller's own file. Without a trustworthy mapping
  // that provenance cannot be stated, and the export is refused.
  const coordinateProblem = validateTableCoordinates(table);
  if (coordinateProblem) {
    return {
      kind: 'blocked',
      allowed: false,
      caveats: [],
      reason:
        'A corrected export was refused because the row positions of the source could not be established ' +
        '(' + coordinateProblem + '). The original file is unchanged and can be downloaded below.',
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
 *
 * Refuses a table whose physical coordinate mapping is incomplete or
 * inconsistent: the provenance of every written record has to be known.
 */
export function buildExportPayload(table: AnalyzedTable, rows: string[][]): ExportPayload {
  const coordinateProblem = validateTableCoordinates(table);
  if (coordinateProblem) {
    throw new Error(
      'The export was refused because the row positions of the source could not be established (' +
        coordinateProblem + ').',
    );
  }
  return {
    records: [...table.instructionRecords, table.headers, ...rows],
    recordNumbers: [
      ...table.instructionRecordsPhysical,
      table.headerRecord,
      ...table.physicalRecords,
    ],
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
