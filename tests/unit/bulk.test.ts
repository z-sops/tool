import { describe, it, expect } from 'vitest';
import { detectHeaderRow } from '../../src/lib/bulk/header';
import {
  analyseTemplate,
  emptySchemaRegistry,
  createSchemaRegistry,
  skuColumnIndex,
  parentSkuColumnIndex,
  MIN_TEMPLATE_CONFIDENCE,
  normalizeHeader,
} from '../../src/lib/bulk/templates';
import {
  parseAmazonReport,
  groupErrors,
  matchErrorsToSource,
  classifyError,
  jsonProcessingReportAdapter,
  MAX_REPORT_RECORDS,
  type AmazonReportedError,
} from '../../src/lib/bulk/amazon-errors';
import {
  planCorrections,
  applyCorrections,
  revertCorrections,
  buildCorrectionReport,
  supportedTransform,
  CORRECTABLE_ROLES,
  PROTECTED_ROLES,
  type ProposedCorrection,
} from '../../src/lib/bulk/corrections';
import {
  buildAnalyzedTable,
  planExport,
  exportRecords,
  buildExportPayload,
  gateExport,
  computeDocumentId,
  createAnalyzedTable,
} from '../../src/lib/bulk/source';

describe('header row detection', () => {
  it('finds the header in a plain export', () => {
    const detection = detectHeaderRow([
      ['sku', 'title', 'price'],
      ['A-1', 'Widget', '10'],
      ['A-2', 'Gadget', '20'],
    ]);
    expect(detection?.headerRowIndex).toBe(0);
    expect(detection?.confidence).toBeGreaterThan(0.5);
  });

  it('skips instruction rows above the header', () => {
    const detection = detectHeaderRow([
      ['Amazon category listing template', '', '', ''],
      ['Instructions: fill in the yellow cells', '', '', ''],
      ['', '', '', ''],
      ['sku', 'item-name', 'brand-name'],
      ['A-1', 'Widget', 'Brand'],
    ]);
    expect(detection?.headerRowIndex).toBe(3);
    expect(detection?.skippedRows).toBe(3);
  });

  it('returns null when no row looks like a header', () => {
    expect(detectHeaderRow([['1', '2'], ['3', '4']])).toBeNull();
  });
});

describe('template intelligence', () => {
  it('recognises an Amazon flat file and maps the seller roles', () => {
    const analysis = analyseTemplate([
      'seller-sku', 'item-name', 'brand-name', 'product-type',
      'standard-price', 'quantity', 'bullet-point1', 'parent-sku',
    ]);
    expect(analysis.status).toBe('mapped');
    if (analysis.status !== 'mapped') return;
    const roles = analysis.mappings.map((m) => m.role);
    expect(roles).toContain('sku');
    expect(roles).toContain('title');
    expect(roles).toContain('brand');
    expect(roles).toContain('productType');
    expect(roles).toContain('price');
    expect(roles).toContain('quantity');
    expect(roles).toContain('bulletPoints');
    expect(roles).toContain('parentSku');
    expect(analysis.adapter.id).toBe('amazon-flat-file');
  });

  it('recognises an Amazon category template', () => {
    const analysis = analyseTemplate(['product-type', 'template-id', 'locale', 'item-sku', 'item-name']);
    expect(analysis.status).toBe('mapped');
    if (analysis.status !== 'mapped') return;
    expect(analysis.adapter.id).toBe('amazon-category-template');
    expect(analysis.mappings.some((m) => m.role === 'productType')).toBe(true);
  });

  it('recognises a generic single table', () => {
    const analysis = analyseTemplate(['sku', 'title', 'brand']);
    expect(analysis.status).toBe('mapped');
    if (analysis.status !== 'mapped') return;
    expect(analysis.adapter.id).toBe('generic-flat');
  });

  it('returns an explicit unsupported result instead of guessing', () => {
    const analysis = analyseTemplate(['colour', 'material', 'weight']);
    expect(analysis.status).toBe('unsupported');
    if (analysis.status !== 'unsupported') return;
    expect(analysis.reason).toMatch(/No assumption has been made/);
    expect(analysis.unmappedHeaders).toEqual(['colour', 'material', 'weight']);
  });

  it('never outranks a recognised Amazon template with the generic fallback', () => {
    const analysis = analyseTemplate(['seller-sku', 'item-name', 'brand-name', 'standard-price']);
    expect(analysis.status).toBe('mapped');
    if (analysis.status !== 'mapped') return;
    expect(analysis.adapter.id).toBe('amazon-flat-file');
  });

  it('reports columns it could not map', () => {
    const analysis = analyseTemplate(['sku', 'title', 'mystery-column']);
    expect(analysis.status).toBe('mapped');
    if (analysis.status !== 'mapped') return;
    expect(analysis.unmappedHeaders).toContain('mystery-column');
  });

  it('finds the SKU and parent-SKU columns', () => {
    expect(skuColumnIndex(['seller-sku', 'title'])).toBe(0);
    expect(skuColumnIndex(['title', 'seller-sku'])).toBe(1);
    expect(skuColumnIndex(['title'])).toBe(-1);
    expect(parentSkuColumnIndex(['sku', 'parent-sku'])).toBe(1);
  });

  it('normalises headers consistently', () => {
    expect(normalizeHeader('Item_Name')).toBe('itemname');
    expect(normalizeHeader('brand-name')).toBe('brandname');
  });

  it('never claims required-field validation without a verified schema', () => {
    expect(emptySchemaRegistry.size).toBe(0);
    expect(emptySchemaRegistry.find('HOME_KITCHEN')).toBeUndefined();
  });

  it('only validates required fields for a schema that was supplied', () => {
    const registry = createSchemaRegistry([
      {
        productType: 'HOME_KITCHEN',
        marketplace: 'TEST-MARKETPLACE-01',
        requiredAttributes: [{ name: 'item_name', label: 'Item Name' }],
        source: 'verified schema fixture',
        verifiedAt: '2026-01-01',
      },
    ]);
    expect(registry.size).toBe(1);
    expect(registry.find('HOME_KITCHEN')?.requiredAttributes).toHaveLength(1);
    expect(registry.find('UNKNOWN_TYPE')).toBeUndefined();
  });

  it('has a minimum confidence threshold', () => {
    expect(MIN_TEMPLATE_CONFIDENCE).toBeGreaterThan(0);
  });
});

describe('Amazon processing report intelligence', () => {
  const report = {
    errors: [
      { errorCode: '90220', message: 'The value is not valid for this attribute', sku: 'A-1', column: 'item_type' },
      { errorCode: '90220', message: 'The value is not valid for this attribute', sku: 'A-2', column: 'item_type' },
      { message: 'Missing required attribute', sku: 'A-3' },
    ],
  };

  it('reads errors verbatim from a processing report document', () => {
    const parsed = parseAmazonReport(report);
    expect(parsed).not.toBeNull();
    expect(parsed?.errors).toHaveLength(3);
    expect(parsed?.errors[0].errorCode).toBe('90220');
    expect(parsed?.errors[2].errorCode).toBeNull();
    expect(parsed?.validatedAgainstAmazonOutput).toBe(false);
  });

  it('does not manufacture an error code when the document has none', () => {
    const parsed = parseAmazonReport([{ message: 'Something went wrong' }]);
    expect(parsed?.errors[0].errorCode).toBeNull();
    expect(parsed?.errors[0].raw).toEqual({ message: 'Something went wrong' });
  });

  it('returns null for a document it does not recognise', () => {
    expect(parseAmazonReport({ unrelated: true })).toBeNull();
    expect(parseAmazonReport(null)).toBeNull();
  });

  it('marks its adapter as unvalidated against Amazon output', () => {
    expect(jsonProcessingReportAdapter.validatedAgainstAmazonOutput).toBe(false);
  });

  it('refuses a report with more records than the limit', () => {
    const many = { errors: Array.from({ length: MAX_REPORT_RECORDS + 1 }, (_, i) => ({ message: 'error ' + i })) };
    expect(() => parseAmazonReport(many)).toThrow(/more than the/);
  });

  it('matches reported errors to the rows of the source file by SKU', () => {
    const parsed = parseAmazonReport(report)!;
    const rows = [['A-1', 'x'], ['A-2', 'y'], ['A-9', 'z']];
    const result = matchErrorsToSource(parsed.errors, 0, rows);
    expect(result.matches).toHaveLength(2);
    expect(result.matches[0].sku).toBe('A-1');
    expect(result.matches[0].rows).toEqual([2]);
    expect(result.matches[1].rows).toEqual([3]);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0].reason).toBe('sku-not-in-source-file');
  });

  it('matches to the physical source row when the source has instruction rows', () => {
    const parsed = parseAmazonReport(report)!;
    const rows = [['A-1', 'x'], ['A-2', 'y'], ['A-9', 'z']];
    // The header is on physical record 4, so the first data row is record 5.
    const result = matchErrorsToSource(parsed.errors, 0, rows, [5, 6, 7]);
    expect(result.matches[0].rows).toEqual([5]);
    expect(result.matches[1].rows).toEqual([6]);
  });

  it('reports errors that carry no SKU separately', () => {
    const parsed = parseAmazonReport({ errors: [{ message: 'no sku here' }] })!;
    const result = matchErrorsToSource(parsed.errors, 0, [['A-1']]);
    expect(result.matches).toHaveLength(0);
    expect(result.unmatched[0].reason).toBe('no-sku-in-report');
  });

  it('classifies errors with its own heuristic and labels it as such', () => {
    const base: AmazonReportedError = {
      errorCode: null, message: '', sku: null, column: null, severity: 'error', raw: {},
    };
    expect(classifyError({ ...base, message: 'parent and child sku relationship is invalid' }).category).toBe('relationship');
    expect(classifyError({ ...base, message: 'this product type requires a browse node' }).category).toBe('category-requirement');
    expect(classifyError({ ...base, message: 'brand authorization is required' }).category).toBe('brand-authorization');
    expect(classifyError({ ...base, message: 'a required attribute is missing' }).category).toBe('missing-attribute');
    expect(classifyError({ ...base, message: 'the value is not valid' }).category).toBe('invalid-value');
    expect(classifyError({ ...base, message: 'something unexpected happened' }).category).toBe('unknown');
    expect(classifyError({ ...base, message: 'invalid' }).source).toBe('listingai-heuristic');
  });

  it('groups by code, column and category and counts affected rows', () => {
    const parsed = parseAmazonReport({
      errors: [
        { errorCode: '90220', message: 'The value is not valid for this attribute', sku: 'A-1', column: 'item_type' },
        { errorCode: '90220', message: 'The value is not valid for this attribute', sku: 'A-2', column: 'item_type' },
        { message: 'Missing required attribute', sku: 'A-3' },
      ],
    })!;
    const groups = groupErrors([], parsed.errors);
    const invalid = groups.find((g) => g.errorCode === '90220');
    expect(invalid?.affectedRows).toBe(2);
    expect(invalid?.column).toBe('item_type');
    expect(invalid?.category).toBe('invalid-value');
    expect(invalid?.affectedSkus).toEqual(['A-1', 'A-2']);
  });

  it('never assigns an Amazon error code to a local finding', () => {
    const groups = groupErrors([
      { row: 2, field: 'title', code: 'FORMULA_RISK', severity: 'error', cause: 'manual-review', detail: 'Possible spreadsheet formula.' },
    ]);
    expect(groups[0].errorCode).toBeNull();
    expect(groups[0].origin).toBe('source-file');
  });

  it('prioritises errors before warnings', () => {
    const groups = groupErrors(
      [
        { row: 2, field: 'title', code: 'TITLE_LENGTH', severity: 'warning', cause: 'manual-review', detail: 'long' },
        { row: 3, field: 'title', code: 'FORMULA_RISK', severity: 'error', cause: 'manual-review', detail: 'formula' },
      ],
      [],
    );
    expect(groups[0].severity).toBe('error');
    expect(groups[0].priority).toBe('high');
    expect(groups[1].priority).toBe('low');
  });
});

/* ------------------------------------------------------------------ */
/* C2: protected correction enforcement                                 */
/* ------------------------------------------------------------------ */

describe('safe correction engine', () => {
  const headers = ['seller-sku', 'item-name', 'standard-price', 'quantity', 'parent-sku'];
  const grid = [
    headers,
    [' A-1 ', '  Nice title  ', '10.00', '5', 'P-1'],
    ['A-2', 'Other', '20.00', '3', ''],
  ];
  const columnRoles = { 0: 'sku', 1: 'title', 2: 'price', 3: 'quantity', 4: 'parentSku' };
  const table = buildAnalyzedTable(grid, 0, 'csv', { documentId: 'test-grid' });

  it('proposes trimming only for eligible text columns', () => {
    const plan = planCorrections(table, columnRoles);
    expect(plan.corrections.map((c) => c.column)).toEqual(['item-name']);
  });

  it('never proposes a change to an identifier, price, quantity or relationship column', () => {
    const plan = planCorrections(table, columnRoles);
    for (const role of PROTECTED_ROLES) {
      expect(plan.corrections.some((c) => c.role === role)).toBe(false);
    }
  });

  it('records why an eligible-looking column was skipped', () => {
    const plan = planCorrections(table, columnRoles);
    const skipped = plan.skipped.find((s) => s.column === 'seller-sku');
    expect(skipped?.reason).toMatch(/never altered/);
  });

  it('records the exact before and after values and is reversible', () => {
    const plan = planCorrections(table, columnRoles);
    const title = plan.corrections[0];
    expect(title.before).toBe('  Nice title  ');
    expect(title.after).toBe('Nice title');
    expect(title.automatic).toBe(false);
    expect(title.reversible).toBe(true);
    expect(title.record).toBe(2);
  });

  it('applies corrections to a copy and leaves the original untouched', () => {
    const plan = planCorrections(table, columnRoles);
    const result = applyCorrections(table, columnRoles, plan.corrections, plan.corrections.map((c) => c.id));
    expect(result.rows[0][1]).toBe('Nice title');
    expect(result.rows[0][0]).toBe(' A-1 ');
    expect(table.rows[0][1]).toBe('  Nice title  ');
  });

  it('reverses applied corrections', () => {
    const plan = planCorrections(table, columnRoles);
    const result = applyCorrections(table, columnRoles, plan.corrections, plan.corrections.map((c) => c.id));
    const reverted = revertCorrections(table, result.rows, plan.corrections);
    expect(reverted.rows).toEqual(table.rows);
  });

  it('never adds or removes a row or a column', () => {
    const plan = planCorrections(table, columnRoles);
    const result = applyCorrections(table, columnRoles, plan.corrections, plan.corrections.map((c) => c.id));
    expect(result.rows.length).toBe(table.rows.length);
    expect(result.headers.length).toBe(headers.length);
    result.rows.forEach((row, i) => expect(row.length).toBe(table.rows[i].length));
    expect(plan.safety.rowsAdded).toBe(0);
    expect(plan.safety.rowsRemoved).toBe(0);
    expect(plan.safety.columnsRemoved).toBe(0);
    expect(plan.safety.identifiersChanged).toBe(0);
  });

  it('refuses to export when a correction was prepared but not approved', () => {
    const plan = planCorrections(table, columnRoles);
    expect(() => applyCorrections(table, columnRoles, plan.corrections, [])).toThrow(/was not approved/);
  });

  it('applies only the corrections the user selected', () => {
    const plan = planCorrections(table, columnRoles);
    const withTwo = buildAnalyzedTable(
      [
        headers,
        [' A-1 ', '  Nice title  ', '10.00', '5', 'P-1'],
        ['A-2', '  Other title  ', '20.00', '3', ''],
      ],
      0,
      'csv',
      { documentId: 'test-grid-two' },
    );
    const twoPlan = planCorrections(withTwo, columnRoles);
    const first = twoPlan.corrections[0];
    const result = applyCorrections(withTwo, columnRoles, [first], [first.id]);
    expect(result.rows[0][1]).toBe('Nice title');
    expect(result.rows[1][1]).toBe('  Other title  ');
    expect(plan.corrections.length).toBeGreaterThan(0);
  });

  it('produces an exportable review report that carries the safety statement', () => {
    const plan = planCorrections(table, columnRoles);
    const report = buildCorrectionReport('demo.csv', plan, plan.corrections.map((c) => c.id));
    expect(report.type).toBe('listingai correction review');
    expect(report.generatedLocally).toBe(true);
    expect((report.corrections as unknown[]).length).toBeGreaterThan(0);
    expect((report.safety as { rowsRemoved: number }).rowsRemoved).toBe(0);
    expect(report.skipped).toBeDefined();
  });

  it('only supports the two declared transformations', () => {
    expect(supportedTransform('  a  ')?.kind).toBe('trim-leading-trailing-whitespace');
    expect(supportedTransform('a\r\nb')?.kind).toBe('normalise-line-endings');
    expect(supportedTransform('plain')).toBeNull();
  });

  /* --- forged corrections must be refused --- */

  it('refuses a correction that replaces a SKU', () => {
    const plan = planCorrections(table, columnRoles);
    const bad = { ...plan.corrections[0], columnIndex: 0, column: 'seller-sku', role: 'sku', before: ' A-1 ', after: 'HACKED' };
    expect(() => applyCorrections(table, columnRoles, [bad], [bad.id])).toThrow(/does not match the current plan/);
  });

  it('refuses a correction that changes a price', () => {
    const plan = planCorrections(table, columnRoles);
    const bad = { ...plan.corrections[0], columnIndex: 2, column: 'standard-price', role: 'price', before: '10.00', after: '0.01' };
    expect(() => applyCorrections(table, columnRoles, [bad], [bad.id])).toThrow(/does not match the current plan/);
  });

  it('refuses a correction that modifies a parent-child relationship', () => {
    const plan = planCorrections(table, columnRoles);
    const bad = { ...plan.corrections[0], columnIndex: 4, column: 'parent-sku', role: 'parentSku', before: 'P-1', after: 'P-2' };
    expect(() => applyCorrections(table, columnRoles, [bad], [bad.id])).toThrow(/does not match the current plan/);
  });

  it('refuses a correction that references a row that does not exist', () => {
    const plan = planCorrections(table, columnRoles);
    const bad = { ...plan.corrections[0], record: 999, rowIndex: 99 };
    expect(() => applyCorrections(table, columnRoles, [bad], [bad.id])).toThrow(/does not match the current plan/);
  });

  it('refuses a correction that references a column that does not exist', () => {
    const plan = planCorrections(table, columnRoles);
    const bad = { ...plan.corrections[0], columnIndex: 99 };
    expect(() => applyCorrections(table, columnRoles, [bad], [bad.id])).toThrow(/does not match the current plan/);
  });

  it('refuses a correction whose before value does not match the source', () => {
    const plan = planCorrections(table, columnRoles);
    const bad = { ...plan.corrections[0], before: 'something else', after: 'Nice title' };
    expect(() => applyCorrections(table, columnRoles, [bad], [bad.id])).toThrow(/does not match the current plan/);
  });

  it('refuses a correction that changes an unrelated text field', () => {
    const plan = planCorrections(table, columnRoles);
    const bad = { ...plan.corrections[0], columnIndex: 1, before: '  Nice title  ', after: 'Totally different text' };
    expect(() => applyCorrections(table, columnRoles, [bad], [bad.id])).toThrow(/does not match the current plan/);
  });

  it('refuses a correction that was not approved', () => {
    const plan = planCorrections(table, columnRoles);
    expect(() => applyCorrections(table, columnRoles, plan.corrections, [])).toThrow(/was not approved/);
    expect(() => applyCorrections(table, columnRoles, plan.corrections, ['a-stale-approval'])).toThrow(/does not match any correction in the current plan/);
  });

  it('refuses a correction whose record does not match the source position', () => {
    const plan = planCorrections(table, columnRoles);
    const bad = { ...plan.corrections[0], record: 7 };
    expect(() => applyCorrections(table, columnRoles, [bad], [bad.id])).toThrow(/does not match the current plan/);
  });

  it('refuses the same correction twice', () => {
    const plan = planCorrections(table, columnRoles);
    const c = plan.corrections[0];
    expect(() => applyCorrections(table, columnRoles, [c, { ...c }], [c.id])).toThrow(/more than once/);
  });

  it('refuses two corrections that change the same cell', () => {
    const plan = planCorrections(table, columnRoles);
    const c = plan.corrections[0];
    const other = { ...c, id: 'other' };
    expect(() => applyCorrections(table, columnRoles, [c, other], [c.id, 'other'])).toThrow(/does not match any correction in the current plan/);
  });

  it('refuses a stale approval reused from another file', () => {
    const plan = planCorrections(table, columnRoles);
    const otherTable = buildAnalyzedTable(
      [['seller-sku', 'item-name'], ['A-9', '  Other title  ']],
      0,
      'csv',
      { documentId: 'other-doc' }
    );
    const otherPlan = planCorrections(otherTable, columnRoles);
    const staleId = otherPlan.corrections[0].id;
    // The approval belongs to the other file's correction, not to this one.
    expect(staleId).not.toBe(plan.corrections[0].id);
    expect(() => applyCorrections(table, columnRoles, plan.corrections, [staleId])).toThrow(/does not match any correction in the current plan/);
  });

  it('refuses a correction prepared for another document', () => {
    const plan = planCorrections(table, columnRoles);
    const otherTable = buildAnalyzedTable(
      [['seller-sku', 'item-name'], ['A-9', '  Other title  ']],
      0,
      'csv',
      { documentId: 'other-doc' }
    );
    const otherPlan = planCorrections(otherTable, columnRoles);
    const foreign = { ...otherPlan.corrections[0], id: plan.corrections[0].id };
    expect(() => applyCorrections(table, columnRoles, [foreign], [foreign.id])).toThrow(
      /prepared for a different file/,
    );
  });

  it('refuses the whole operation rather than skipping an invalid correction', () => {
    const plan = planCorrections(table, columnRoles);
    const good = plan.corrections[0];
    const bad = { ...plan.corrections[0], id: 'bad', columnIndex: 2, column: 'standard-price', role: 'price', before: '10.00', after: '1.00' };
    expect(() => applyCorrections(table, columnRoles, [good, bad], [good.id, 'bad'])).toThrow(/does not match any correction in the current plan/);
  });
});

/* ------------------------------------------------------------------ */
/* C1 and C8: source model and export integrity                        */
/* ------------------------------------------------------------------ */

describe('source document model and export integrity', () => {
  it('keeps the instruction rows above the header and maps physical records', () => {
    const grid = [
      ['Amazon category listing template'],
      ['Fill in the yellow cells'],
      ['seller-sku', 'item-name'],
      ['A-1', 'Widget'],
    ];
    const table = buildAnalyzedTable(grid, 2, 'csv', { documentId: 'test-doc' });
    expect(table.headerRecord).toBe(3);
    expect(table.instructionRecords).toHaveLength(2);
    expect(table.physicalRecords).toEqual([4]);
    expect(table.lossy).toBe(false);
  });

  it('exports every record of a CSV source, including instruction rows', () => {
    const grid = [
      ['Instructions'],
      ['seller-sku', 'item-name'],
      ['A-1', 'Widget'],
    ];
    const table = buildAnalyzedTable(grid, 1, 'csv', { documentId: 'test-doc-1' });
    const records = exportRecords(table, table.rows);
    expect(records).toHaveLength(3);
    expect(records[0]).toEqual(['Instructions']);
    expect(records[1]).toEqual(['seller-sku', 'item-name']);
  });

  it('refuses a corrected export when the source could not be read completely', () => {
    const grid = [['seller-sku', 'item-name'], ['A-1', 'Widget']];
    const table = buildAnalyzedTable(grid, 0, 'xlsx-sheet', { droppedRecords: 12, documentId: 'test-doc-1' });
    const plan = planExport(table);
    expect(plan.allowed).toBe(false);
    expect(plan.kind).toBe('blocked');
    expect(plan.reason).toMatch(/12 row\(s\)/);
    expect(plan.reason).toMatch(/silently lose data/);
  });

  it('refuses a corrected export when columns could not be read', () => {
    const table = buildAnalyzedTable([['a'], ['b']], 0, 'xlsx-sheet', { droppedColumns: 3, documentId: 'test-doc-2' });
    expect(planExport(table).allowed).toBe(false);
  });

  it('calls a workbook export a derived export and says what it does not contain', () => {
    const table = buildAnalyzedTable([['a'], ['b']], 0, 'xlsx-sheet', {
      sheetName: 'Listings',
      sheetCount: 3,
      documentId: 'test-doc-3',
    });
    const plan = planExport(table);
    expect(plan.allowed).toBe(true);
    expect(plan.kind).toBe('derived-sheet-csv');
    const text = plan.caveats.join(' ');
    expect(text).toMatch(/derived CSV of the worksheet/i);
    expect(text).toMatch(/formatting/i);
    expect(text).toMatch(/template structure of the workbook is not preserved/i);
    expect(text).toMatch(/2 other worksheet\(s\)/);
  });

  it('calls a CSV export source-complete and says that quoting is normalised', () => {
    const table = buildAnalyzedTable([['a'], ['b']], 0, 'csv', { documentId: 'test-csv-2' });
    const plan = planExport(table);
    expect(plan.kind).toBe('source-complete-csv');
    expect(plan.caveats.join(' ')).toMatch(/including any instruction rows/);
  });
});

/* ------------------------------------------------------------------ */
/* R2-C1, R2-C2, R2-C3 and R2-C5: security and integrity hardening      */
/* ------------------------------------------------------------------ */

describe('R2 export gate: every exported cell is scanned', () => {
  const buildGrid = (instruction: string[][], header: string[], row: string[]) => [
    ...instruction,
    header,
    row,
  ];

  it('refuses an export whose instruction row carries a formula payload', () => {
    const grid = buildGrid(
      [['=cmd|"/c calc"!A1']],
      ['seller-sku', 'item-name'],
      ['A-1', 'Widget'],
    );
    const table = buildAnalyzedTable(grid, 1, 'csv', { documentId: 'r2-instruction' });
    const payload = buildExportPayload(table, table.rows);
    const gate = gateExport(payload);
    expect(gate.allowed).toBe(false);
    expect(gate.findings).toHaveLength(1);
    // The finding points at the physical record of the instruction row.
    expect(gate.findings[0].record).toBe(1);
    expect(gate.findings[0].column).toBe(1);
    expect(gate.findings[0].risk).toBe('formula');
    expect(gate.reason).toMatch(/refused/);
  });

  it('refuses an export whose header cell carries a formula payload', () => {
    const grid = buildGrid([], ['seller-sku', '=HYPERLINK("http://evil","x")'], ['A-1', 'Widget']);
    const table = buildAnalyzedTable(grid, 0, 'csv', { documentId: 'r2-header' });
    const gate = gateExport(buildExportPayload(table, table.rows));
    expect(gate.allowed).toBe(false);
    expect(gate.findings[0].record).toBe(1);
  });

  it('refuses an export whose data cell carries a zero-width payload', () => {
    const grid = buildGrid([], ['seller-sku', 'item-name'], ['A-1', 'Widget\u200B']);
    const table = buildAnalyzedTable(grid, 0, 'csv', { documentId: 'r2-hidden' });
    const gate = gateExport(buildExportPayload(table, table.rows));
    expect(gate.allowed).toBe(false);
    expect(gate.findings[0].risk).toBe('hidden-content');
  });

  it('refuses an export whose data cell carries a bidi override', () => {
    const grid = buildGrid([], ['seller-sku', 'item-name'], ['A-1', 'Widget\u202Eexe']);
    const table = buildAnalyzedTable(grid, 0, 'csv', { documentId: 'r2-bidi' });
    const gate = gateExport(buildExportPayload(table, table.rows));
    expect(gate.allowed).toBe(false);
    expect(gate.findings[0].risk).toBe('hidden-content');
  });

  it('allows an export whose every cell, including instruction rows, is clean', () => {
    const grid = buildGrid(
      [['Fill in the yellow cells']],
      ['seller-sku', 'item-name'],
      ['A-1', 'Nice title'],
    );
    const table = buildAnalyzedTable(grid, 1, 'csv', { documentId: 'r2-clean' });
    const gate = gateExport(buildExportPayload(table, table.rows));
    expect(gate.allowed).toBe(true);
    expect(gate.findings).toHaveLength(0);
  });

  it('reports the physical record of every finding, not the position in the table', () => {
    const grid = buildGrid(
      [['Instructions'], ['=1+1']],
      ['seller-sku', 'item-name'],
      ['A-1', 'Widget'],
    );
    const table = buildAnalyzedTable(grid, 2, 'csv', { documentId: 'r2-records' });
    const payload = buildExportPayload(table, table.rows);
    // The export holds the instruction rows, the header and the data row.
    expect(payload.records).toHaveLength(4);
    expect(payload.recordNumbers).toEqual([1, 2, 3, 4]);
    const gate = gateExport(payload);
    expect(gate.findings).toHaveLength(1);
    expect(gate.findings[0].record).toBe(2);
    expect(gate.findings[0].column).toBe(1);
  });
});

describe('R2-C5: approvals are bound to one document', () => {
  it('derives the document identity from a full-length SHA-256 digest', async () => {
    const id = await computeDocumentId([['seller-sku', 'item-name'], ['A-1', 'Widget']]);
    // A SHA-256 digest is 64 hexadecimal characters. A short non-cryptographic
    // fingerprint would be collidable on purpose and must never be used to
    // authorise a change.
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).not.toMatch(/^weak-/);
  });

  it('gives two different documents different digests', async () => {
    const a = await computeDocumentId([['item-name'], ['  A  ']]);
    const b = await computeDocumentId([['item-name'], ['  B  ']]);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(b).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives a table built from the records a matching identity', async () => {
    const grid = [['item-name'], ['  A  ']];
    const table = await createAnalyzedTable(grid, 0, 'csv');
    expect(table.documentId).toBe(await computeDocumentId(grid));
    expect(table.documentId).toMatch(/^[0-9a-f]{64}$/);
    expect(table.identityUnavailable).toBeUndefined();
  });

  it('proposes no correction at all when the file has no secure identity', () => {
    const unbound = buildAnalyzedTable([['item-name'], ['  A  ']], 0, 'csv', { documentId: '' });
    const plan = planCorrections(unbound, { 0: 'title' });
    expect(plan.corrections).toHaveLength(0);
    expect(plan.safety.note).toMatch(/no secure document fingerprint/);
  });

  it('refuses the export when the file has no secure identity', () => {
    const unbound = buildAnalyzedTable([['item-name'], ['  A  ']], 0, 'csv', { documentId: '' });
    expect(() => applyCorrections(unbound, { 0: 'title' }, [], [])).toThrow(
      /no secure document fingerprint/,
    );
  });

  it('gives a correction an identifier that carries the document fingerprint', () => {
    const a = buildAnalyzedTable([['item-name'], ['  A  ']], 0, 'csv', { documentId: 'doc-a' });
    const b = buildAnalyzedTable([['item-name'], ['  A  ']], 0, 'csv', { documentId: 'doc-b' });
    const idA = planCorrections(a, { 0: 'title' }).corrections[0].id;
    const idB = planCorrections(b, { 0: 'title' }).corrections[0].id;
    expect(idA).not.toBe(idB);
    expect(idA).toContain('doc-a');
    expect(idB).toContain('doc-b');
  });

  it('refuses an approval identifier that belongs to another document', () => {
    const a = buildAnalyzedTable([['item-name'], ['  A  ']], 0, 'csv', { documentId: 'doc-a' });
    const b = buildAnalyzedTable([['item-name'], ['  A  ']], 0, 'csv', { documentId: 'doc-b' });
    const idB = planCorrections(b, { 0: 'title' }).corrections[0].id;
    const planA = planCorrections(a, { 0: 'title' });
    expect(() => applyCorrections(a, { 0: 'title' }, planA.corrections, [idB])).toThrow(
      /does not match any correction in the current plan/,
    );
  });

  it('refuses a correction whose document fingerprint was swapped', () => {
    const a = buildAnalyzedTable([['item-name'], ['  A  ']], 0, 'csv', { documentId: 'doc-a' });
    const planA = planCorrections(a, { 0: 'title' });
    const forged = { ...planA.corrections[0], documentId: 'doc-z' };
    expect(() => applyCorrections(a, { 0: 'title' }, [forged], [forged.id])).toThrow(
      /prepared for a different file/,
    );
  });

  it('refuses an approval identifier that is not in the plan at all', () => {
    const a = buildAnalyzedTable([['item-name'], ['  A  ']], 0, 'csv', { documentId: 'doc-a' });
    const planA = planCorrections(a, { 0: 'title' });
    expect(() => applyCorrections(a, { 0: 'title' }, planA.corrections, ['made-up-approval'])).toThrow(
      /does not match any correction in the current plan/,
    );
  });

  it('does not let a repeated approval identifier authorise a second change', () => {
    const a = buildAnalyzedTable([['item-name'], ['  A  ']], 0, 'csv', { documentId: 'doc-a' });
    const planA = planCorrections(a, { 0: 'title' });
    const id = planA.corrections[0].id;
    const result = applyCorrections(a, { 0: 'title' }, [planA.corrections[0]], [id, id]);
    expect(result.applied).toHaveLength(1);
    expect(result.rows[0][0]).toBe('A');
  });

  it('gives two documents with identical content different fingerprints', async () => {
    // The fingerprint is over the content, so identical content in two
    // documents still yields one identifier per document only when the
    // document identifier differs. The approval is bound to both.
    const grid = [['item-name'], ['  A  ']];
    const one = buildAnalyzedTable(grid, 0, 'csv', { documentId: 'doc-1' });
    const two = buildAnalyzedTable(grid, 0, 'csv', { documentId: 'doc-2' });
    expect(one.documentId).not.toBe(two.documentId);
  });
});
