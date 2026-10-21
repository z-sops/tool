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
  type AmazonReportedError,
} from '../../src/lib/bulk/amazon-errors';
import {
  planCorrections,
  applyCorrections,
  revertCorrections,
  buildCorrectionReport,
  PROTECTED_ROLES,
} from '../../src/lib/bulk/corrections';

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
      { errorCode: '90220', message: 'The value is not valid for this category', sku: 'A-1', column: 'item_type' },
      { errorCode: '90220', message: 'The value is not valid for this category', sku: 'A-2', column: 'item_type' },
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

  it('classifies a category-related message as a category requirement', () => {
    const parsed = parseAmazonReport({
      errors: [{ errorCode: '90220', message: 'The value is not valid for this category', sku: 'A-1', column: 'item_type' }],
    })!;
    const groups = groupErrors([], parsed.errors);
    expect(groups[0].category).toBe('category-requirement');
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

describe('safe correction engine', () => {
  const headers = ['seller-sku', 'item-name', 'standard-price', 'quantity', 'parent-sku'];
  const rows = [
    [' A-1 ', '  Nice title  ', '10.00', '5', 'P-1'],
    ['A-2', 'Other', '20.00', '3', ''],
  ];
  const columnRoles = { 0: 'sku', 1: 'title', 2: 'price', 3: 'quantity', 4: 'parentSku' };

  it('proposes trimming only for eligible text columns', () => {
    const plan = planCorrections(headers, rows, columnRoles);
    expect(plan.corrections.map((c) => c.column)).toEqual(['item-name']);
  });

  it('never proposes a change to an identifier, price, quantity or relationship column', () => {
    const plan = planCorrections(headers, rows, columnRoles);
    for (const role of PROTECTED_ROLES) {
      expect(plan.corrections.some((c) => c.role === role)).toBe(false);
    }
  });

  it('records why an eligible-looking column was skipped', () => {
    const plan = planCorrections(headers, rows, columnRoles);
    const skipped = plan.skipped.find((s) => s.column === 'seller-sku');
    expect(skipped?.reason).toMatch(/never altered/);
  });

  it('records the exact before and after values and is reversible', () => {
    const plan = planCorrections(headers, rows, columnRoles);
    const title = plan.corrections[0];
    expect(title.before).toBe('  Nice title  ');
    expect(title.after).toBe('Nice title');
    expect(title.automatic).toBe(false);
    expect(title.reversible).toBe(true);
  });

  it('applies corrections to a copy and leaves the original untouched', () => {
    const plan = planCorrections(headers, rows, columnRoles);
    const corrected = applyCorrections(headers, rows, plan.corrections);
    expect(corrected.rows[0][1]).toBe('Nice title');
    expect(corrected.rows[0][0]).toBe(' A-1 ');
    expect(rows[0][1]).toBe('  Nice title  ');
  });

  it('reverses applied corrections', () => {
    const plan = planCorrections(headers, rows, columnRoles);
    const corrected = applyCorrections(headers, rows, plan.corrections);
    const reverted = revertCorrections(corrected.headers, corrected.rows, plan.corrections);
    expect(reverted.rows).toEqual(rows);
  });

  it('applies only the corrections the user selected', () => {
    const plan = planCorrections(headers, rows, columnRoles);
    const corrected = applyCorrections(headers, rows, []);
    expect(corrected.rows[0][1]).toBe('  Nice title  ');
  });

  it('never adds or removes a row or a column', () => {
    const plan = planCorrections(headers, rows, columnRoles);
    const corrected = applyCorrections(headers, rows, plan.corrections);
    expect(corrected.rows.length).toBe(rows.length);
    expect(corrected.headers.length).toBe(headers.length);
    corrected.rows.forEach((row, i) => expect(row.length).toBe(rows[i].length));
    expect(plan.safety.rowsAdded).toBe(0);
    expect(plan.safety.rowsRemoved).toBe(0);
    expect(plan.safety.columnsRemoved).toBe(0);
    expect(plan.safety.identifiersChanged).toBe(0);
  });

  it('refuses to produce an export whose structure changed', () => {
    const plan = planCorrections(headers, rows, columnRoles);
    const bad = [{ ...plan.corrections[0], row: 99 }];
    // An out-of-range row is ignored rather than corrupting the document.
    const corrected = applyCorrections(headers, rows, bad);
    expect(corrected.rows.length).toBe(rows.length);
  });

  it('produces an exportable review report that carries the safety statement', () => {
    const plan = planCorrections(headers, rows, columnRoles);
    const report = buildCorrectionReport('demo.csv', plan, plan.corrections.map((c) => c.id));
    expect(report.type).toBe('listingai correction review');
    expect(report.generatedLocally).toBe(true);
    expect((report.corrections as unknown[]).length).toBeGreaterThan(0);
    expect((report.safety as { rowsRemoved: number }).rowsRemoved).toBe(0);
    expect(report.skipped).toBeDefined();
  });
});
