import { Inflate } from 'fflate';

/**
 * Local, defensive XLSX reader.
 *
 * Design constraints (ListingAI M1b):
 * - The workbook is parsed entirely in the browser. Nothing is uploaded.
 * - Formulas are never evaluated. A cell containing a formula keeps the
 *   *cached* value that the file already stores, and the formula text is
 *   reported separately so the caller can flag it.
 * - Scripts, macros, external links, embedded objects and media are never
 *   read: only the four XML parts needed for cell data are extracted.
 * - Every stage is bounded: input size, uncompressed size, entry count,
 *   sheet count, row count and column count.
 *
 * There is no formula engine and no macro engine in this module, and there is
 * no code path that could execute workbook content.
 *
 * The archive is read through its own central directory rather than by handing
 * the whole file to a decompressor. That is what makes the resource limits
 * trustworthy: the size of every entry is read from the archive metadata and
 * checked *before* the entry is inflated, the inflated result is checked
 * against the metadata afterwards, and the inflation itself is stopped as soon
 * as the ceiling is reached, so a compression bomb cannot consume unbounded
 * CPU or memory.
 */

export const MAX_XLSX_BYTES = 10 * 1024 * 1024;
export const MAX_XLSX_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;
export const MAX_XLSX_ENTRIES = 2000;
export const MAX_SHEETS = 50;
export const MAX_SHEET_ROWS = 5000;
export const MAX_SHEET_COLUMNS = 200;
/** A single cell longer than this is flagged; the value itself is kept. */
export const MAX_CELL_CHARS = 32_768;
/** A single part larger than this is refused. */
export const MAX_PART_BYTES = 16 * 1024 * 1024;
/** The highest Excel row number that is accepted (1 048 576). */
const MAX_ROW_NUMBER = 1_048_576;

export type XlsxErrorCode =
  | 'NOT_A_ZIP'
  | 'ZIP_CORRUPT'
  | 'TOO_LARGE'
  | 'TOO_MANY_ENTRIES'
  | 'UNCOMPRESSED_LIMIT'
  | 'NO_WORKBOOK'
  | 'MALFORMED_XML'
  | 'NO_SHEETS'
  | 'SHEET_LIMIT'
  | 'ROW_LIMIT'
  | 'COLUMN_LIMIT'
  | 'INVALID_REFERENCE'
  | 'DUPLICATE_CELL'
  | 'INCONSISTENT_WORKBOOK'
  | 'UNSUPPORTED_ARCHIVE';

export class XlsxError extends Error {
  readonly code: XlsxErrorCode;
  constructor(code: XlsxErrorCode, message: string) {
    super(message);
    this.name = 'XlsxError';
    this.code = code;
  }
}

/**
 * Content that can be used to deceive a human reviewing a spreadsheet.
 *
 * - `bidi-override` hides the real end of a string (a classic title-spoofing
 *   trick in marketplace listings).
 * - `control-character` embeds characters that break CSV quoting and can
 *   truncate a value in a downstream tool.
 * - `zero-width` hides text inside an apparently normal value.
 */
export type CellRisk = 'bidi-override' | 'control-character' | 'zero-width' | 'too-long';

const BIDI_OVERRIDE = /[\u202A-\u202E\u2066-\u2069]/;
/** Tab, line feed and carriage return are legitimate; the rest are not. */
const CONTROL_CHARACTER = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
/** U+200C/U+200D are legitimate joiners in emoji sequences and are not flagged. */
const ZERO_WIDTH = /[\u200B\uFEFF]/;

/** Classifies the content risk of a cell value. Returns null when it is clean. */
export function classifyCell(value: string): CellRisk | null {
  if (value.length > MAX_CELL_CHARS) return 'too-long';
  if (BIDI_OVERRIDE.test(value)) return 'bidi-override';
  if (CONTROL_CHARACTER.test(value)) return 'control-character';
  if (ZERO_WIDTH.test(value)) return 'zero-width';
  return null;
}

export interface XlsxCell {
  /** Display value as stored in the file. Empty string when the cell has no value. */
  value: string;
  /** Raw formula text, present only when the cell contains a formula. Never evaluated. */
  formula?: string;
  /** True when the file itself stores a cached result for the formula. */
  hasCachedValue: boolean;
  /** Content risk of the cell value, or null when the value is clean. */
  risk?: CellRisk;
  /** The physical Excel row this cell sits on. */
  rowNumber: number;
  /** The zero-based physical Excel column this cell sits in. */
  columnIndex: number;
}

export interface XlsxSheet {
  name: string;
  rows: XlsxCell[][];
  /**
   * The physical Excel row number of each parsed row, in the order the rows
   * appear in `rows`. Worksheet XML may omit blank rows, so this is not
   * necessarily 1, 2, 3.
   */
  rowNumbers: number[];
  /**
   * The highest physical row number present in the sheet, which is the number
   * of rows in the sheet including the ones the file omitted.
   */
  physicalRowCount: number;
  /** Number of rows the file actually carried. */
  sourceRowCount: number;
  truncated: boolean;
  /** How many rows were dropped because the sheet exceeded the row limit. */
  truncatedRows: number;
}

export interface XlsxWorkbook {
  sheets: XlsxSheet[];
}

/* ------------------------------------------------------------------ */
/* Cell references                                                      */
/* ------------------------------------------------------------------ */

export interface CellReference {
  /** Zero-based column index. */
  columnIndex: number;
  /** One-based row number. */
  rowNumber: number;
}

/**
 * A complete A1-style reference: one to three upper case letters for the
 * column and a positive row number. Anything else is refused, so "A0", "A1junk",
 * "a1" and "1A" are not accepted as references.
 */
const A1_REFERENCE = /^([A-Z]{1,3})([1-9][0-9]{0,6})$/;

/** Parses a complete A1-style reference. Returns null when it is not valid. */
export function parseCellReference(ref: string): CellReference | null {
  if (!ref) return null;
  const match = A1_REFERENCE.exec(ref);
  if (!match) return null;
  const letters = match[1];
  const rowNumber = Number.parseInt(match[2], 10);
  if (!Number.isSafeInteger(rowNumber) || rowNumber < 1 || rowNumber > MAX_ROW_NUMBER) return null;
  let columnIndex = 0;
  for (let i = 0; i < letters.length; i++) {
    columnIndex = columnIndex * 26 + (letters.charCodeAt(i) - 64);
  }
  columnIndex -= 1;
  return { columnIndex, rowNumber };
}

/**
 * "BC12" -> 54 (zero-based column index), or -1 when the reference is not a
 * valid A1-style reference.
 */
export function columnRefToIndex(ref: string): number {
  const parsed = parseCellReference(ref);
  return parsed ? parsed.columnIndex : -1;
}

/* ------------------------------------------------------------------ */
/* ZIP reading                                                          */
/* ------------------------------------------------------------------ */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const ZIP64_MARKER = 0xffffffff;

interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  /** General purpose bit flag. */
  flags: number;
}

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

/** Finds the end-of-central-directory record, scanning backwards from the end. */
function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const max = Math.min(bytes.length, 0xffff + 22);
  for (let i = bytes.length - 22; i >= bytes.length - max && i >= 0; i--) {
    if (view(bytes).getUint32(i, true) === EOCD_SIGNATURE) return i;
  }
  throw new XlsxError('ZIP_CORRUPT', 'This file is not a readable archive: the central directory was not found.');
}

/**
 * Reads every entry of the central directory, validating each entry's
 * boundaries against both the directory and the file.
 */
function readCentralDirectory(bytes: Uint8Array): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(bytes);
  const dv = view(bytes);
  const total = dv.getUint16(eocd + 10, true);
  const size = dv.getUint32(eocd + 12, true);
  const offset = dv.getUint32(eocd + 16, true);

  if (total > MAX_XLSX_ENTRIES) {
    throw new XlsxError('TOO_MANY_ENTRIES', `Workbook contains more than ${MAX_XLSX_ENTRIES} archive entries.`);
  }
  if (offset + size > bytes.length) {
    throw new XlsxError('ZIP_CORRUPT', 'This file is not a readable archive: the central directory is out of range.');
  }
  const directoryEnd = offset + size;

  const entries: ZipEntry[] = [];
  let cursor = offset;
  for (let i = 0; i < total; i++) {
    // The fixed part of the entry must fit inside the directory and the file.
    if (cursor + 46 > directoryEnd || cursor + 46 > bytes.length) {
      throw new XlsxError('ZIP_CORRUPT', 'This file is not a readable archive: a central directory entry is truncated.');
    }
    if (dv.getUint32(cursor, true) !== CENTRAL_SIGNATURE) {
      throw new XlsxError('ZIP_CORRUPT', 'This file is not a readable archive: a central directory entry has a bad signature.');
    }
    const flags = dv.getUint16(cursor + 8, true);
    const compressionMethod = dv.getUint16(cursor + 10, true);
    const compressedSize = dv.getUint32(cursor + 20, true);
    const uncompressedSize = dv.getUint32(cursor + 24, true);
    const nameLength = dv.getUint16(cursor + 28, true);
    const extraLength = dv.getUint16(cursor + 30, true);
    const commentLength = dv.getUint16(cursor + 32, true);
    const localHeaderOffset = dv.getUint32(cursor + 42, true);

    // The name, extra field and comment must fit inside the directory entry.
    const entryEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (entryEnd > directoryEnd || entryEnd > bytes.length) {
      throw new XlsxError('ZIP_CORRUPT', 'This file is not a readable archive: a central directory entry overruns the directory.');
    }
    if (nameLength === 0) {
      throw new XlsxError('ZIP_CORRUPT', 'This file is not a readable archive: an entry has no name.');
    }

    const name = new TextDecoder('utf-8').decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    entries.push({ name, flags, compressionMethod, compressedSize, uncompressedSize, localHeaderOffset });
    cursor = entryEnd;
  }
  return entries;
}

/** Rejects archive paths that try to escape the archive root. */
function isSafePartName(name: string): boolean {
  if (!name || name.startsWith('/') || name.startsWith('\\')) return false;
  if (/^[a-zA-Z]:/.test(name)) return false;
  return !name.split(/[\\/]/).includes('..');
}

/**
 * Only these parts are ever read. Macros (`vbaProject.bin`), external links,
 * embedded objects, media and drawings are never inflated, so their contents
 * never reach the parser.
 */
function isAllowedPart(name: string): boolean {
  if (name === 'xl/workbook.xml') return true;
  if (name === 'xl/_rels/workbook.xml.rels') return true;
  if (name === 'xl/sharedStrings.xml') return true;
  return /^xl\/worksheets\/sheet\d+\.xml$/.test(name);
}

/** The archive features this reader does not support. */
function assertSupportedFeatures(entry: ZipEntry): void {
  if (entry.flags & 0x1) {
    throw new XlsxError('UNSUPPORTED_ARCHIVE', 'This workbook is encrypted, which is not supported.');
  }
  if (entry.flags & 0x40) {
    throw new XlsxError('UNSUPPORTED_ARCHIVE', 'This workbook uses strong encryption, which is not supported.');
  }
  if (entry.compressionMethod !== 0 && entry.compressionMethod !== 8) {
    throw new XlsxError(
      'UNSUPPORTED_ARCHIVE',
      'The part "' + entry.name + '" uses an unsupported compression method.',
    );
  }
  if (entry.uncompressedSize === ZIP64_MARKER || entry.compressedSize === ZIP64_MARKER) {
    throw new XlsxError('UNSUPPORTED_ARCHIVE', 'This workbook uses a ZIP64 archive, which is not supported.');
  }
}

/**
 * Inflates one entry with a hard cap on the produced bytes.
 *
 * The ceiling is enforced *during* the inflation: the compressed input is fed
 * in small blocks and the inflation is abandoned as soon as the cap is passed,
 * so a high-expansion payload cannot consume unbounded CPU or memory.
 */
function inflateBounded(data: Uint8Array, cap: number, partName: string): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  let exceeded = false;
  const inflate = new Inflate((chunk) => {
    total += chunk.length;
    if (total > cap) {
      exceeded = true;
      return;
    }
    chunks.push(chunk);
  });

  const BLOCK = 64 * 1024;
  for (let offset = 0; offset < data.length && !exceeded; offset += BLOCK) {
    const end = Math.min(offset + BLOCK, data.length);
    inflate.push(data.subarray(offset, end), end === data.length);
  }

  if (exceeded) {
    throw new XlsxError(
      'UNCOMPRESSED_LIMIT',
      `The part "${partName}" expands beyond its permitted size and was not read.`,
    );
  }

  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/**
 * Reads the parts of the archive that the tool needs, with every limit
 * enforced against the archive metadata before anything is inflated and
 * against the produced bytes afterwards.
 */
function extractParts(bytes: Uint8Array): Map<string, Uint8Array> {
  const entries = readCentralDirectory(bytes);
  const dv = view(bytes);

  let declaredTotal = 0;
  const seenNames = new Set<string>();
  for (const entry of entries) {
    if (!isSafePartName(entry.name)) {
      throw new XlsxError('ZIP_CORRUPT', 'Workbook contains an unsafe archive path.');
    }
    assertSupportedFeatures(entry);
    if (seenNames.has(entry.name)) {
      throw new XlsxError('ZIP_CORRUPT', 'The workbook contains the part "' + entry.name + '" more than once.');
    }
    seenNames.add(entry.name);
    // Only the parts that are actually read count towards the limit. A part the
    // tool never opens cannot exhaust memory.
    if (isAllowedPart(entry.name)) declaredTotal += entry.uncompressedSize;
  }
  if (declaredTotal > MAX_XLSX_UNCOMPRESSED_BYTES) {
    throw new XlsxError(
      'UNCOMPRESSED_LIMIT',
      `Workbook expands beyond the ${Math.round(MAX_XLSX_UNCOMPRESSED_BYTES / (1024 * 1024))} MB uncompressed limit.`,
    );
  }

  const wanted = entries.filter((entry) => isAllowedPart(entry.name));
  const parts = new Map<string, Uint8Array>();
  let actualTotal = 0;

  for (const entry of wanted) {
    if (entry.uncompressedSize > MAX_PART_BYTES) {
      throw new XlsxError(
        'UNCOMPRESSED_LIMIT',
        `The part "${entry.name}" is too large to read and was not opened.`,
      );
    }
    const header = entry.localHeaderOffset;
    // The local header must fit inside the file before anything is read from it.
    if (header + 30 > bytes.length) {
      throw new XlsxError('ZIP_CORRUPT', `The part "${entry.name}" has an unreadable local header.`);
    }
    if (dv.getUint32(header, true) !== LOCAL_SIGNATURE) {
      throw new XlsxError('ZIP_CORRUPT', `The part "${entry.name}" has an unreadable local header.`);
    }
    const nameLength = dv.getUint16(header + 26, true);
    const extraLength = dv.getUint16(header + 28, true);
    if (header + 30 + nameLength + extraLength > bytes.length) {
      throw new XlsxError('ZIP_CORRUPT', `The part "${entry.name}" has a local header that overruns the file.`);
    }
    const localName = new TextDecoder('utf-8').decode(bytes.subarray(header + 30, header + 30 + nameLength));
    if (localName !== entry.name) {
      throw new XlsxError('ZIP_CORRUPT', `The part "${entry.name}" has inconsistent archive metadata.`);
    }
    const dataStart = header + 30 + nameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataEnd > bytes.length || dataEnd < dataStart) {
      throw new XlsxError('ZIP_CORRUPT', `The part "${entry.name}" is truncated.`);
    }

    const raw = bytes.subarray(dataStart, dataEnd);
    const inflated = entry.compressionMethod === 0 ? raw : inflateBounded(raw, MAX_PART_BYTES, entry.name);

    // The inflated size must match the size the archive declared, in both
    // directions. An oversized result means the archive lied upwards; an
    // undersized result means the integrity of the part cannot be established.
    if (inflated.length !== entry.uncompressedSize) {
      throw new XlsxError(
        'ZIP_CORRUPT',
        `The part "${entry.name}" does not match the size declared in the archive ` +
          `(${inflated.length} bytes read, ${entry.uncompressedSize} declared).`,
      );
    }

    actualTotal += inflated.length;
    if (actualTotal > MAX_XLSX_UNCOMPRESSED_BYTES) {
      throw new XlsxError(
        'UNCOMPRESSED_LIMIT',
        `Workbook expands beyond the ${Math.round(MAX_XLSX_UNCOMPRESSED_BYTES / (1024 * 1024))} MB uncompressed limit.`,
      );
    }
    parts.set(entry.name, inflated);
  }

  return parts;
}

/* ------------------------------------------------------------------ */
/* XML helpers                                                          */
/* ------------------------------------------------------------------ */

function parseXml(text: string, partName: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const error = doc.querySelector('parsererror');
  if (error || !doc.documentElement) {
    throw new XlsxError('MALFORMED_XML', `Could not parse ${partName}.`);
  }
  return doc;
}

const decoder = new TextDecoder('utf-8');
const decode = (data: Uint8Array): string => decoder.decode(data);

/** Concatenates every `<t>` descendant, which handles rich-text runs. */
function textContentOf(element: Element | null): string {
  if (!element) return '';
  const parts = element.getElementsByTagName('t');
  let out = '';
  for (let i = 0; i < parts.length; i++) out += parts[i].textContent ?? '';
  return out;
}

/** `<t>` may live directly under the element or inside `<r>` runs. */
function directText(element: Element): string {
  const own = element.getElementsByTagName('t');
  if (own.length === 0) return element.textContent ?? '';
  let out = '';
  for (let i = 0; i < own.length; i++) out += own[i].textContent ?? '';
  return out;
}

/* ------------------------------------------------------------------ */
/* Part parsing                                                         */
/* ------------------------------------------------------------------ */

function parseSharedStrings(parts: Map<string, Uint8Array>): string[] {
  const part = parts.get('xl/sharedStrings.xml');
  if (!part) return [];
  const doc = parseXml(decode(part), 'sharedStrings.xml');
  const items = doc.getElementsByTagName('si');
  const out: string[] = [];
  for (let i = 0; i < items.length; i++) out.push(directText(items[i]));
  return out;
}

interface WorkbookSheetRef {
  name: string;
  relationshipId: string;
}

function parseWorkbookParts(parts: Map<string, Uint8Array>): WorkbookSheetRef[] {
  const part = parts.get('xl/workbook.xml');
  if (!part) throw new XlsxError('NO_WORKBOOK', 'This file does not contain an Excel workbook (xl/workbook.xml is missing).');
  const doc = parseXml(decode(part), 'workbook.xml');
  const sheets = doc.getElementsByTagName('sheet');
  const out: WorkbookSheetRef[] = [];
  for (let i = 0; i < sheets.length; i++) {
    const el = sheets[i];
    const relationshipId =
      el.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ??
      el.getAttribute('r:id') ??
      '';
    out.push({ name: el.getAttribute('name') ?? `Sheet ${i + 1}`, relationshipId });
  }
  return out;
}

function parseRelationships(parts: Map<string, Uint8Array>): Map<string, string> {
  const part = parts.get('xl/_rels/workbook.xml.rels');
  const map = new Map<string, string>();
  if (!part) return map;
  const doc = parseXml(decode(part), 'workbook.xml.rels');
  const rels = doc.getElementsByTagName('Relationship');
  for (let i = 0; i < rels.length; i++) {
    const el = rels[i];
    const id = el.getAttribute('Id');
    const target = el.getAttribute('Target');
    if (!id || !target) continue;
    map.set(id, target);
  }
  return map;
}

/** Resolves a relationship target against the `xl/` base directory. */
function resolveSheetPath(target: string): string | null {
  if (/^[a-zA-Z]+:\/\//.test(target)) return null; // external target: never followed
  const segments = target.replace(/^\.\//, '').split('/');
  const stack: string[] = [];
  for (const segment of segments) {
    if (segment === '..') stack.pop();
    else if (segment !== '.' && segment !== '') stack.push(segment);
  }
  const joined = stack.join('/');
  const path = joined.startsWith('xl/') ? joined : `xl/${joined}`;
  return isSafePartName(path) ? path : null;
}

interface ParsedRow {
  rowNumber: number;
  cells: XlsxCell[];
}

/**
 * Parses one worksheet.
 *
 * The physical Excel row number comes from the `r` attribute of the row, not
 * from the position of the row in the file: worksheet XML may omit blank rows,
 * so the first row in a file can be row 1 and the next row 5.
 */
function parseSheet(part: Uint8Array, sharedStrings: string[], sheetName: string): XlsxSheet {
  const doc = parseXml(decode(part), sheetName);
  const sheetData = doc.getElementsByTagName('sheetData');
  const rowElements = sheetData.length ? sheetData[0].getElementsByTagName('row') : doc.getElementsByTagName('row');

  const parsed: ParsedRow[] = [];
  const usedCoordinates = new Set<string>();
  let sourceRowCount = 0;
  let truncated = false;
  let truncatedRows = 0;
  let previousRowNumber = 0;

  for (let r = 0; r < rowElements.length; r++) {
    const rowEl = rowElements[r];
    sourceRowCount += 1;

    // The row coordinate, when the file states one.
    const rowAttribute = rowEl.getAttribute('r');
    let rowNumber: number;
    if (rowAttribute === null) {
      // No coordinate: continue from the previous row.
      rowNumber = previousRowNumber + 1;
    } else {
      if (!/^[1-9][0-9]{0,6}$/.test(rowAttribute)) {
        throw new XlsxError(
          'INVALID_REFERENCE',
          `Sheet "${sheetName}" contains an invalid row reference "${rowAttribute}".`,
        );
      }
      rowNumber = Number.parseInt(rowAttribute, 10);
      if (rowNumber > MAX_ROW_NUMBER) {
        throw new XlsxError('INVALID_REFERENCE', `Sheet "${sheetName}" contains an out-of-range row reference "${rowAttribute}".`);
      }
    }
    previousRowNumber = rowNumber;

    if (parsed.length >= MAX_SHEET_ROWS) {
      truncated = true;
      truncatedRows += 1;
      continue;
    }

    const cells: XlsxCell[] = [];
    const cellElements = rowEl.getElementsByTagName('c');
    for (let c = 0; c < cellElements.length; c++) {
      const cellEl = cellElements[c];
      const ref = cellEl.getAttribute('r');
      let columnIndex = cells.length;
      if (ref !== null) {
        const reference = parseCellReference(ref);
        if (!reference) {
          throw new XlsxError(
            'INVALID_REFERENCE',
            `Sheet "${sheetName}" contains an invalid cell reference "${ref}".`,
          );
        }
        if (reference.rowNumber !== rowNumber) {
          throw new XlsxError(
            'INVALID_REFERENCE',
            `Sheet "${sheetName}" places the cell "${ref}" in row ${rowNumber}.`,
          );
        }
        columnIndex = reference.columnIndex;
      }
      if (columnIndex >= MAX_SHEET_COLUMNS) {
        throw new XlsxError('COLUMN_LIMIT', `Sheet "${sheetName}" has more than ${MAX_SHEET_COLUMNS} columns.`);
      }

      const coordinate = rowNumber + ':' + columnIndex;
      if (usedCoordinates.has(coordinate)) {
        throw new XlsxError(
          'DUPLICATE_CELL',
          `Sheet "${sheetName}" uses the cell at row ${rowNumber}, column ${columnIndex + 1} more than once.`,
        );
      }
      usedCoordinates.add(coordinate);

      const type = cellEl.getAttribute('t') ?? 'n';
      const formulaEl = cellEl.getElementsByTagName('f');
      const formula = formulaEl.length ? (formulaEl[0].textContent ?? '') : undefined;
      const valueEl = cellEl.getElementsByTagName('v');
      const rawValue = valueEl.length ? (valueEl[0].textContent ?? '') : '';

      let value = '';
      let hasStoredValue = false;
      if (type === 's') {
        const index = Number.parseInt(rawValue, 10);
        value = Number.isNaN(index) ? '' : (sharedStrings[index] ?? '');
        hasStoredValue = !Number.isNaN(index);
      } else if (type === 'inlineStr') {
        const inline = cellEl.getElementsByTagName('is');
        value = inline.length ? textContentOf(inline[0]) : '';
        hasStoredValue = inline.length > 0;
      } else if (type === 'b') {
        value = rawValue === '1' ? 'TRUE' : 'FALSE';
        hasStoredValue = true;
      } else {
        value = rawValue;
        hasStoredValue = rawValue !== '';
      }
      // A formula is only "cached" when the file itself stores a result for it.
      const hasCachedValue = formula === undefined ? true : hasStoredValue;

      const cell: XlsxCell = { value, hasCachedValue, rowNumber, columnIndex };
      if (formula !== undefined) cell.formula = formula;
      const risk = classifyCell(value);
      if (risk) cell.risk = risk;
      while (cells.length < columnIndex) {
        cells.push({ value: '', hasCachedValue: true, rowNumber, columnIndex: cells.length });
      }
      cells[columnIndex] = cell;
    }
    parsed.push({ rowNumber, cells });
  }

  // The rows are ordered by their physical coordinate, so the analysis table
  // always reads the sheet from the top down.
  parsed.sort((a, b) => a.rowNumber - b.rowNumber);

  const rows = parsed.map((row) => row.cells);
  const rowNumbers = parsed.map((row) => row.rowNumber);
  const physicalRowCount = rowNumbers.length ? Math.max(...rowNumbers) : 0;

  return { name: sheetName, rows, rowNumbers, physicalRowCount, sourceRowCount, truncated, truncatedRows };
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/**
 * Parses an XLSX workbook from raw bytes. Never evaluates formulas and never
 * reads macros, external links or embedded content.
 */
export async function parseWorkbook(bytes: Uint8Array): Promise<XlsxWorkbook> {
  if (bytes.byteLength > MAX_XLSX_BYTES) {
    throw new XlsxError('TOO_LARGE', `Workbook is larger than the ${Math.round(MAX_XLSX_BYTES / (1024 * 1024))} MB limit.`);
  }
  if (bytes.byteLength < 22) throw new XlsxError('NOT_A_ZIP', 'This file is not an Excel workbook.');

  let parts: Map<string, Uint8Array>;
  try {
    parts = extractParts(bytes);
  } catch (err) {
    if (err instanceof XlsxError) throw err;
    throw new XlsxError('ZIP_CORRUPT', 'This file could not be opened as an Excel workbook.');
  }

  const sheetRefs = parseWorkbookParts(parts);
  if (!sheetRefs.length) throw new XlsxError('NO_SHEETS', 'This workbook does not contain any worksheets.');
  if (sheetRefs.length > MAX_SHEETS) {
    throw new XlsxError('SHEET_LIMIT', `This workbook has more than ${MAX_SHEETS} worksheets.`);
  }

  const sharedStrings = parseSharedStrings(parts);
  const relationships = parseRelationships(parts);

  const sheets: XlsxSheet[] = [];
  for (const ref of sheetRefs) {
    const target = relationships.get(ref.relationshipId);
    if (!target) {
      throw new XlsxError(
        'INCONSISTENT_WORKBOOK',
        `The worksheet "${ref.name}" does not point at a readable part of the workbook.`,
      );
    }
    const path = resolveSheetPath(target);
    if (!path) {
      throw new XlsxError('INCONSISTENT_WORKBOOK', `The worksheet "${ref.name}" points outside the workbook.`);
    }
    const part = parts.get(path);
    if (!part) {
      throw new XlsxError(
        'INCONSISTENT_WORKBOOK',
        `The worksheet "${ref.name}" refers to "${path}", which is not in the workbook.`,
      );
    }
    sheets.push(parseSheet(part, sharedStrings, ref.name));
  }

  if (!sheets.length) throw new XlsxError('NO_SHEETS', 'No worksheet data could be read from this workbook.');
  return { sheets };
}

/** Reads and parses an XLSX file chosen in the browser. */
export async function readWorkbookFile(file: File): Promise<XlsxWorkbook> {
  if (file.size > MAX_XLSX_BYTES) {
    throw new XlsxError('TOO_LARGE', `Workbook is larger than the ${Math.round(MAX_XLSX_BYTES / (1024 * 1024))} MB limit. The file was not loaded.`);
  }
  const buffer = await file.arrayBuffer();
  return parseWorkbook(new Uint8Array(buffer));
}
