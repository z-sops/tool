/**
 * Safe correction engine (ListingAI M1b corrections C2).
 *
 * Workflow: original -> analysis -> proposed fix -> before/after diff -> user
 * approval -> corrected export.
 *
 * The application layer enforces every rule itself. A correction object
 * handed in by a caller is treated as untrusted input: it is re-checked
 * against the actual source before it is applied, and anything that does not
 * match is refused with an actionable error rather than skipped.
 *
 * Enforced here:
 *  - Only eligible text fields can be modified.
 *  - SKU, parent SKU, identifiers, variation attributes, product type, brand,
 *    category, price and quantity are protected.
 *  - Every correction must reference a record and a column that exist.
 *  - The "before" value must still match the actual source.
 *  - The "after" value must be one of the explicitly supported transformations
 *    of the "before" value.
 *  - Every applied correction must be approved by the user.
 *  - Duplicate, stale, forged, out-of-bounds or conflicting corrections are
 *    refused.
 */

import type { AnalyzedTable } from './source';

export type CorrectionKind =
  | 'trim-leading-trailing-whitespace'
  | 'normalise-line-endings';

/** Roles whose values may be trimmed after explicit approval. */
export const CORRECTABLE_ROLES = ['title', 'description', 'bulletPoints'] as const;
export type CorrectableRole = (typeof CORRECTABLE_ROLES)[number];

/** Roles that must never be altered, whatever the user approves. */
export const PROTECTED_ROLES = [
  'sku',
  'identifier',
  'parentSku',
  'variationAttributes',
  'price',
  'quantity',
  'brand',
  'productType',
  'category',
] as const;

export interface ProposedCorrection {
  id: string;
  /**
   * The fingerprint of the document the correction was prepared for. A
   * correction prepared for another file is refused.
   */
  documentId: string;
  /** 1-based physical record number in the source document. */
  record: number;
  /** 0-based index into the analysed rows. */
  rowIndex: number;
  /** 0-based index into the analysed columns. */
  columnIndex: number;
  column: string;
  role: string;
  before: string;
  after: string;
  kind: CorrectionKind;
  rationale: string;
  reversible: true;
  automatic: false;
}

export interface SkippedCorrection {
  record: number;
  column: string;
  reason: string;
}

/** Structural guarantees that hold for every produced export. */
export interface CorrectionSafety {
  rowsAdded: 0;
  rowsRemoved: 0;
  columnsRemoved: 0;
  identifiersChanged: 0;
  protectedRoles: readonly string[];
  note: string;
}

export interface CorrectionPlan {
  corrections: ProposedCorrection[];
  skipped: SkippedCorrection[];
  safety: CorrectionSafety;
}

export const CORRECTION_SAFETY_NOTE =
  'Only whitespace and line endings inside columns you approved are changed. ' +
  'No row is added or removed, no column is dropped, and no identifier, price, ' +
  'quantity, brand, product type or variation value is altered.';

/* ------------------------------------------------------------------ */
/* The supported transformations                                        */
/* ------------------------------------------------------------------ */

const normaliseLineEndings = (value: string): string => value.replace(/\r\n?/g, '\n');

const trimEdges = (value: string): string => value.replace(/^[^\S\n]+|[^\S\n]+$/g, '');

const isTrimmable = (value: string): boolean => value !== value.replace(/^[ \t]+|[ \t]+$/g, '');

/**
 * The only two transformations a correction may perform. `applyCorrections`
 * recomputes the expected result and compares it with the proposed value, so a
 * forged "after" value is refused.
 */
export function supportedTransform(value: string): { value: string; kind: CorrectionKind } | null {
  const afterLineEndings = normaliseLineEndings(value);
  const trimmed = trimEdges(afterLineEndings);
  if (trimmed === value) return null;
  const kind: CorrectionKind =
    afterLineEndings !== value && trimEdges(afterLineEndings) === afterLineEndings
      ? 'normalise-line-endings'
      : 'trim-leading-trailing-whitespace';
  return { value: trimmed, kind };
}

/* ------------------------------------------------------------------ */
/* Planning                                                             */
/* ------------------------------------------------------------------ */

/**
 * Builds the correction plan for a table. `columnRoles` maps a column index to
 * the semantic role that was detected for it. Columns whose role is not
 * correctable are listed as skipped so the user can see that they were
 * considered and deliberately left alone.
 */
export function planCorrections(
  table: AnalyzedTable,
  columnRoles: Record<number, string>,
): CorrectionPlan {
  const corrections: ProposedCorrection[] = [];
  const skipped: SkippedCorrection[] = [];

  table.rows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const column = table.headers[columnIndex] ?? 'column-' + (columnIndex + 1);
      const role = columnRoles[columnIndex] ?? 'unknown';
      const record = table.physicalRecords[rowIndex] ?? rowIndex + 2;

      if (!(CORRECTABLE_ROLES as readonly string[]).includes(role)) {
        if (isTrimmable(value)) {
          skipped.push({
            record,
            column,
            reason: (PROTECTED_ROLES as readonly string[]).includes(role)
              ? 'This column holds an identifier, price, quantity, brand, product type or relationship value and is never altered.'
              : 'Only title, description and bullet columns are eligible for trimming.',
          });
        }
        return;
      }

      const transform = supportedTransform(value);
      if (!transform) return;

      corrections.push({
        // The identifier carries the document fingerprint, so an identifier
        // from one file can never authorise a correction in another.
        id: 'd' + table.documentId + '-r' + record + 'c' + columnIndex,
        documentId: table.documentId,
        record,
        rowIndex,
        columnIndex,
        column,
        role,
        before: value,
        after: transform.value,
        kind: transform.kind,
        rationale:
          transform.kind === 'normalise-line-endings'
            ? 'Windows line endings inside the cell were normalised to a single line feed.'
            : 'Leading and trailing whitespace was removed.',
        reversible: true,
        automatic: false,
      });
    });
  });

  return {
    corrections,
    skipped,
    safety: {
      rowsAdded: 0,
      rowsRemoved: 0,
      columnsRemoved: 0,
      identifiersChanged: 0,
      protectedRoles: PROTECTED_ROLES,
      note: CORRECTION_SAFETY_NOTE,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Application, with independent enforcement                            */
/* ------------------------------------------------------------------ */

export class CorrectionRejected extends Error {
  readonly correctionId: string | null;
  constructor(correctionId: string | null, message: string) {
    super(message);
    this.name = 'CorrectionRejected';
    this.correctionId = correctionId;
  }
}

export interface ApplyResult {
  headers: string[];
  rows: string[][];
  applied: ProposedCorrection[];
}

/**
 * Applies approved corrections to a copy of the table.
 *
 * Every correction is re-validated against the actual source. Nothing is
 * skipped: the first invalid correction refuses the whole operation.
 */
export function applyCorrections(
  table: AnalyzedTable,
  columnRoles: Record<number, string>,
  corrections: ProposedCorrection[],
  approvedIds: string[],
): ApplyResult {
  const seenIds = new Set<string>();
  const touched = new Map<string, string>();
  const approved = new Set(approvedIds);
  const toApply: ProposedCorrection[] = [];

  for (const correction of corrections) {
    if (seenIds.has(correction.id)) {
      throw new CorrectionRejected(correction.id, 'Correction "' + correction.id + '" appears more than once. The export was refused.');
    }
    seenIds.add(correction.id);

    if (correction.documentId !== table.documentId) {
      throw new CorrectionRejected(
        correction.id,
        'Correction "' + correction.id + '" was prepared for a different file. The export was refused.',
      );
    }

    if (!approved.has(correction.id)) {
      throw new CorrectionRejected(
        correction.id,
        'Correction "' + correction.id + '" was not approved. The export was refused.',
      );
    }

    if (
      !Number.isInteger(correction.rowIndex) ||
      correction.rowIndex < 0 ||
      correction.rowIndex >= table.rows.length
    ) {
      throw new CorrectionRejected(
        correction.id,
        'Correction "' + correction.id + '" points at row ' + correction.rowIndex + ', which does not exist in the source. The export was refused.',
      );
    }

    if (
      !Number.isInteger(correction.columnIndex) ||
      correction.columnIndex < 0 ||
      correction.columnIndex >= table.headers.length
    ) {
      throw new CorrectionRejected(
        correction.id,
        'Correction "' + correction.id + '" points at column ' + correction.columnIndex + ', which does not exist in the source. The export was refused.',
      );
    }

    const expectedRecord = table.physicalRecords[correction.rowIndex];
    if (expectedRecord !== undefined && correction.record !== expectedRecord) {
      throw new CorrectionRejected(
        correction.id,
        'Correction "' + correction.id + '" claims source row ' + correction.record + ' but that cell is in source row ' + expectedRecord + '. The export was refused.',
      );
    }

    const role = columnRoles[correction.columnIndex] ?? 'unknown';
    if (!(CORRECTABLE_ROLES as readonly string[]).includes(role)) {
      throw new CorrectionRejected(
        correction.id,
        'Correction "' + correction.id + '" targets "' + correction.column + '", which is a protected ' + role + ' field. The export was refused.',
      );
    }

    const actual = table.rows[correction.rowIndex][correction.columnIndex] ?? '';
    if (actual !== correction.before) {
      throw new CorrectionRejected(
        correction.id,
        'Correction "' + correction.id + '" was prepared for a different value than the source now holds. The export was refused.',
      );
    }

    const transform = supportedTransform(actual);
    if (!transform || transform.value !== correction.after) {
      throw new CorrectionRejected(
        correction.id,
        'Correction "' + correction.id + '" proposes a change that is not a supported transformation. The export was refused.',
      );
    }

    const cellKey = correction.rowIndex + ':' + correction.columnIndex;
    const previous = touched.get(cellKey);
    if (previous !== undefined) {
      throw new CorrectionRejected(
        correction.id,
        'Corrections "' + previous + '" and "' + correction.id + '" both change the same cell. The export was refused.',
      );
    }
    touched.set(cellKey, correction.id);

    toApply.push(correction);
  }

  const nextRows = table.rows.map((row) => row.slice());
  for (const correction of toApply) {
    nextRows[correction.rowIndex][correction.columnIndex] = correction.after;
  }

  if (nextRows.length !== table.rows.length) {
    throw new CorrectionRejected(null, 'The export was refused because the row count changed.');
  }
  for (let i = 0; i < table.rows.length; i++) {
    if (nextRows[i].length !== table.rows[i].length) {
      throw new CorrectionRejected(null, 'The export was refused because a row lost a cell.');
    }
  }

  return { headers: table.headers.slice(), rows: nextRows, applied: toApply };
}

/**
 * Reverts applied corrections using the recorded "before" values.
 */
export function revertCorrections(
  table: AnalyzedTable,
  rows: string[][],
  corrections: ProposedCorrection[],
): { headers: string[]; rows: string[][] } {
  const nextRows = rows.map((row) => row.slice());
  for (const correction of corrections) {
    if (correction.rowIndex < 0 || correction.rowIndex >= nextRows.length) continue;
    const cell = nextRows[correction.rowIndex];
    if (!cell || correction.columnIndex >= cell.length) continue;
    cell[correction.columnIndex] = correction.before;
  }
  return { headers: table.headers.slice(), rows: nextRows };
}

/** Builds the exportable issue report for a correction plan. */
export function buildCorrectionReport(
  fileName: string,
  plan: CorrectionPlan,
  appliedIds: string[],
): Record<string, unknown> {
  return {
    type: 'listingai correction review',
    file: fileName,
    generatedLocally: true,
    appliedCorrectionIds: appliedIds,
    safety: plan.safety,
    corrections: plan.corrections.map((c) => ({
      id: c.id,
      record: c.record,
      column: c.column,
      role: c.role,
      kind: c.kind,
      before: c.before,
      after: c.after,
      rationale: c.rationale,
      reversible: c.reversible,
      automatic: c.automatic,
    })),
    skipped: plan.skipped,
  };
}
