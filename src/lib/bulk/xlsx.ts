import type { Unzipped } from 'fflate';

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
 */

export const MAX_XLSX_BYTES = 10 * 1024 * 1024;
export const MAX_XLSX_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;
export const MAX_XLSX_ENTRIES = 2000;
export const MAX_SHEETS = 50;
export const MAX_SHEET_ROWS = 5000;
export const MAX_SHEET_COLUMNS = 200;
/** A single cell longer than this is flagged; the value itself is kept. */
export const MAX_CELL_CHARS = 32_768;

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
  | 'COLUMN_LIMIT';

export class XlsxError extends Error {
  readonly code: XlsxErrorCode;
  constructor(code: XlsxErrorCode, message: string) {
    super(message);
    this.name = 'XlsxError';
    this.code = code;
  }
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
}

export interface XlsxSheet {
  name: string;
  rows: XlsxCell[][];
  /** Number of rows present in the file (may exceed `rows.length` when truncated). */
  sourceRowCount: number;
  truncated: boolean;
  /** How many rows were dropped because the sheet exceeded the row limit. */
  truncatedRows: number;
}

export interface XlsxWorkbook {
  sheets: XlsxSheet[];
}

/* ------------------------------------------------------------------ */
/* ZIP part selection                                                   */
/* ------------------------------------------------------------------ */

const WORKBOOK_PART = 'xl/workbook.xml';
const RELS_PART = 'xl/_rels/workbook.xml.rels';
const SHARED_STRINGS_PART = 'xl/sharedStrings.xml';
const WORKSHEET_PART = /^xl\/worksheets\/sheet\d+\.xml$/;

/**
 * Only these parts are ever inflated. Macros (`vbaProject.bin`), external
 * links, embedded objects, media and drawings are skipped by the filter, so
 * their contents never reach the parser.
 */
function isAllowedPart(name: string): boolean {
  if (name === WORKBOOK_PART || name === RELS_PART || name === SHARED_STRINGS_PART) return true;
  return WORKSHEET_PART.test(name);
}

/** Rejects archive paths that try to escape the archive root. */
function isSafePartName(name: string): boolean {
  if (!name || name.startsWith('/') || name.startsWith('\\')) return false;
  if (/^[a-zA-Z]:/.test(name)) return false;
  return !name.split(/[\\/]/).includes('..');
}

async function extractParts(bytes: Uint8Array): Promise<Unzipped> {
  // Loaded on demand: the ZIP decoder is only needed when a user opens a
  // workbook, so it stays out of the initial bundle for every other page.
  const { unzip } = await import('fflate');
  let entries = 0;
  let uncompressed = 0;
  let violation: XlsxError | null = null;

  const filter = (file: { name: string; originalSize?: number }) => {
    entries += 1;
    if (entries > MAX_XLSX_ENTRIES) {
      violation = new XlsxError('TOO_MANY_ENTRIES', `Workbook contains more than ${MAX_XLSX_ENTRIES} archive entries.`);
      return false;
    }
    if (!isSafePartName(file.name)) {
      violation = new XlsxError('ZIP_CORRUPT', 'Workbook contains an unsafe archive path.');
      return false;
    }
    if (!isAllowedPart(file.name)) return false;
    const size = file.originalSize ?? 0;
    uncompressed += size;
    if (uncompressed > MAX_XLSX_UNCOMPRESSED_BYTES) {
      violation = new XlsxError('UNCOMPRESSED_LIMIT', `Workbook expands beyond the ${Math.round(MAX_XLSX_UNCOMPRESSED_BYTES / (1024 * 1024))} MB uncompressed limit.`);
      return false;
    }
    return true;
  };

  const files = await new Promise<Unzipped>((resolve, reject) => {
    unzip(bytes, { filter }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  if (violation) throw violation;
  return files;
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

/** "BC12" -> 54 (zero-based column index). */
export function columnRefToIndex(ref: string): number {
  let index = 0;
  for (let i = 0; i < ref.length; i++) {
    const code = ref.charCodeAt(i);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

/* ------------------------------------------------------------------ */
/* Part parsing                                                         */
/* ------------------------------------------------------------------ */

function parseSharedStrings(files: Unzipped): string[] {
  const part = files[SHARED_STRINGS_PART];
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

function parseWorkbookParts(files: Unzipped): WorkbookSheetRef[] {
  const part = files[WORKBOOK_PART];
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

function parseRelationships(files: Unzipped): Map<string, string> {
  const part = files[RELS_PART];
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

function parseSheet(part: Uint8Array, sharedStrings: string[], sheetName: string): XlsxSheet {
  const doc = parseXml(decode(part), sheetName);
  const sheetData = doc.getElementsByTagName('sheetData');
  const rows: XlsxCell[][] = [];
  let sourceRowCount = 0;
  let truncated = false;
  let truncatedRows = 0;

  const rowElements = sheetData.length ? sheetData[0].getElementsByTagName('row') : doc.getElementsByTagName('row');
  for (let r = 0; r < rowElements.length; r++) {
    const rowEl = rowElements[r];
    sourceRowCount += 1;
    if (rows.length >= MAX_SHEET_ROWS) {
      truncated = true;
      truncatedRows += 1;
      continue;
    }
    const cells: XlsxCell[] = [];
    const cellElements = rowEl.getElementsByTagName('c');
    for (let c = 0; c < cellElements.length; c++) {
      const cellEl = cellElements[c];
      const ref = cellEl.getAttribute('r');
      const columnIndex = ref ? columnRefToIndex(ref) : cells.length;
      if (columnIndex >= MAX_SHEET_COLUMNS) {
        throw new XlsxError('COLUMN_LIMIT', `Sheet "${sheetName}" has more than ${MAX_SHEET_COLUMNS} columns.`);
      }
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

      const cell: XlsxCell = { value, hasCachedValue };
      if (formula !== undefined) cell.formula = formula;
      const risk = classifyCell(value);
      if (risk) cell.risk = risk;
      while (cells.length < columnIndex) cells.push({ value: '', hasCachedValue: true });
      cells[columnIndex] = cell;
    }
    rows.push(cells);
  }

  return { name: sheetName, rows, sourceRowCount, truncated, truncatedRows };
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
  if (bytes.byteLength < 4) throw new XlsxError('NOT_A_ZIP', 'This file is not an Excel workbook.');

  let files: Unzipped;
  try {
    files = await extractParts(bytes);
  } catch (err) {
    if (err instanceof XlsxError) throw err;
    throw new XlsxError('ZIP_CORRUPT', 'This file could not be opened as an Excel workbook.');
  }

  const sheetRefs = parseWorkbookParts(files);
  if (!sheetRefs.length) throw new XlsxError('NO_SHEETS', 'This workbook does not contain any worksheets.');
  if (sheetRefs.length > MAX_SHEETS) {
    throw new XlsxError('SHEET_LIMIT', `This workbook has more than ${MAX_SHEETS} worksheets.`);
  }

  const sharedStrings = parseSharedStrings(files);
  const relationships = parseRelationships(files);

  const sheets: XlsxSheet[] = [];
  for (const ref of sheetRefs) {
    const target = relationships.get(ref.relationshipId);
    const path = target ? resolveSheetPath(target) : null;
    if (!path) continue;
    const part = files[path];
    if (!part) continue;
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
