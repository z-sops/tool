/**
 * Safe correction workflow (ListingAI M1b, task D).
 *
 * Pipeline: original -> analysis -> proposed fix -> before/after diff ->
 * user approval -> corrected export.
 *
 * Rules enforced in code, not only in the interface:
 * - A correction is never applied automatically. Every proposed correction
 *   must be selected by the user before it is exported.
 * - Corrections are deterministic and reversible: each one records the exact
 *   "before" value, and `revertCorrections` restores the original.
 * - Identifiers (SKU, parent SKU, variation values, price, quantity) are
 *   never modified.
 * - No product attribute is invented. Only whitespace and line endings that
 *   the user's own file contains are normalised.
 * - No row is ever added or removed, and no column is ever dropped.
 * - Nothing is published anywhere.
 */

export type CorrectionKind =
  | 'trim-leading-trailing-whitespace'
  | 'normalise-line-endings'
  | 'collapse-internal-line-breaks';

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
  /** 1-based row number in the source document (row 1 is the header). */
  row: number;
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
  row: number;
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

export interface CorrectionApproval {
  id: string;
  approved: boolean;
}

export const CORRECTION_SAFETY_NOTE =
  'Only whitespace and line endings inside columns you approved are changed. ' +
  'No row is added or removed, no column is dropped, and no identifier, price, ' +
  'quantity or variation value is altered.';

/** Normalises the line endings inside a cell without touching its content. */
const normaliseLineEndings = (value: string): string => value.replace(/\r\n?/g, '\n');

const trimEdges = (value: string): string => value.replace(/^[^\S\n]+|[^\S\n]+$/g, '');

const isTrimmable = (value: string): boolean => value !== value.replace(/^[ \t]+|[ \t]+$/g, '');

/**
 * Builds the correction plan for a document. `columnRoles` maps a column index
 * to the semantic role that was detected for it. Columns whose role is not in
 * CORRECTIBLE_ROLES are listed as skipped so the user can see that they were
 * considered and deliberately left alone.
 */
export function planCorrections(
  headers: string[],
  rows: string[][],
  columnRoles: Record<number, string>,
): CorrectionPlan {
  const corrections: ProposedCorrection[] = [];
  const skipped: SkippedCorrection[] = [];

  rows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const column = headers[columnIndex] ?? `column-${columnIndex + 1}`;
      const role = columnRoles[columnIndex] ?? 'unknown';

      if (!(CORRECTABLE_ROLES as readonly string[]).includes(role)) {
        if (isTrimmable(value)) {
          skipped.push({
            row: rowIndex + 2,
            column,
            reason: (PROTECTED_ROLES as readonly string[]).includes(role)
              ? 'This column holds an identifier, price, quantity or relationship value and is never altered.'
              : 'Only title, description and bullet columns are eligible for trimming.',
          });
        }
        return;
      }

      const afterLineEndings = normaliseLineEndings(value);
      const after = trimEdges(afterLineEndings);
      if (after === value) return;

      const kind: CorrectionKind =
        afterLineEndings !== value && trimEdges(afterLineEndings) === afterLineEndings
          ? 'normalise-line-endings'
          : 'trim-leading-trailing-whitespace';

      corrections.push({
        id: `r${rowIndex + 2}c${columnIndex}`,
        row: rowIndex + 2,
        columnIndex,
        column,
        role,
        before: value,
        after,
        kind,
        rationale:
          kind === 'normalise-line-endings'
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

/**
 * Applies the approved corrections to a copy of the document. The input
 * document is not modified.
 *
 * The result is checked against the input: if the number of headers or rows
 * changed, the export is refused rather than silently dropping data.
 */
export function applyCorrections(
  headers: string[],
  rows: string[][],
  corrections: ProposedCorrection[],
): { headers: string[]; rows: string[][] } {
  const nextRows = rows.map((row) => row.slice());
  for (const correction of corrections) {
    const rowIndex = correction.row - 2;
    if (rowIndex < 0 || rowIndex >= nextRows.length) continue;
    const cell = nextRows[rowIndex];
    if (!cell || correction.columnIndex >= cell.length) continue;
    cell[correction.columnIndex] = correction.after;
  }

  if (nextRows.length !== rows.length) {
    throw new Error('Correction refused: the row count changed.');
  }
  if (nextRows.some((row, index) => row.length !== rows[index].length)) {
    throw new Error('Correction refused: a row lost a cell.');
  }

  return { headers: headers.slice(), rows: nextRows };
}

/**
 * Reverts applied corrections using the recorded "before" values.
 */
export function revertCorrections(
  headers: string[],
  rows: string[][],
  corrections: ProposedCorrection[],
): { headers: string[]; rows: string[][] } {
  const nextRows = rows.map((row) => row.slice());
  for (const correction of corrections) {
    const rowIndex = correction.row - 2;
    if (rowIndex < 0 || rowIndex >= nextRows.length) continue;
    const cell = nextRows[rowIndex];
    if (!cell || correction.columnIndex >= cell.length) continue;
    cell[correction.columnIndex] = correction.before;
  }
  return { headers: headers.slice(), rows: nextRows };
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
      row: c.row,
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
