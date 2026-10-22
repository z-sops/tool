import { describe, it, expect } from 'vitest';
import { splitDelimited, textProcessingReportAdapter } from '../../src/lib/bulk/text-processing-report';
import {
  parseAmazonReport,
  MAX_REPORT_RECORDS,
  MAX_REPORT_RECORD_CHARS,
  MAX_REPORT_MESSAGE_CHARS,
} from '../../src/lib/bulk/amazon-errors';

/**
 * The layout used here follows Amazon's Seller University troubleshooting
 * guide: the SKU is in column B, the error code in column C and the error
 * description in column E.
 */
const POSITIONAL_REPORT = [
  'Feed Type\tSKU\tError Code\tError Description\tComment',
  'Flat File\tDEMO-SKU-001\t90220\tValue is not valid for this category\tCheck the product type',
  'Flat File\tDEMO-SKU-002\t8058\tThe following attributes are missing for SKU: [DEMO-SKU-002]: [brand]\t',
].join('\n');

const HEADER_REPORT = [
  'SKU\tError Code\tError Message\tAttribute',
  'DEMO-SKU-001\t90220\tValue is not valid\titem_type',
].join('\n');

describe('Amazon Processing Report parser', () => {
  it('splits delimited lines and honours quoted fields', () => {
    expect(splitDelimited('a\tb\tc', '\t')).toEqual(['a', 'b', 'c']);
    expect(splitDelimited('a,"b,c",d', ',')).toEqual(['a', 'b,c', 'd']);
    expect(splitDelimited('a,"say ""hi""",c', ',')).toEqual(['a', 'say "hi"', 'c']);
  });

  it('reads a report with a header row', () => {
    const report = parseAmazonReport(HEADER_REPORT);
    expect(report).not.toBeNull();
    expect(report?.errors).toHaveLength(1);
    expect(report?.errors[0].sku).toBe('DEMO-SKU-001');
    expect(report?.errors[0].errorCode).toBe('90220');
    expect(report?.errors[0].message).toBe('Value is not valid');
    expect(report?.errors[0].column).toBe('item_type');
  });

  it('reads a report using the documented column positions', () => {
    const report = parseAmazonReport(POSITIONAL_REPORT);
    expect(report).not.toBeNull();
    expect(report?.errors).toHaveLength(2);
    expect(report?.errors[0].sku).toBe('DEMO-SKU-001');
    expect(report?.errors[0].errorCode).toBe('90220');
    expect(report?.errors[1].errorCode).toBe('8058');
    expect(report?.errors[1].message).toContain('attributes are missing');
  });

  it('reports which interpretation was used', () => {
    const withoutHeader = [
      'Flat File\tDEMO-SKU-001\t90220\tDescription text\tComment',
    ].join('\n');
    const report = parseAmazonReport(withoutHeader);
    expect(report?.notes.join(' ')).toContain('Seller University troubleshooting guidance');
  });

  it('never invents an error code', () => {
    const report = parseAmazonReport('Flat File\tDEMO-SKU-001\t\tSomething was reported\t');
    expect(report?.errors[0].errorCode).toBeNull();
  });

  it('is not marked as validated against Amazon output', () => {
    expect(textProcessingReportAdapter.validatedAgainstAmazonOutput).toBe(false);
  });

  it('returns null for a document with no errors', () => {
    expect(parseAmazonReport('Feed Type\tSKU\tError Code\tError Description\tComment\n')).toBeNull();
    expect(parseAmazonReport('')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* C6: processing report resource limits                                */
/* ------------------------------------------------------------------ */

describe('processing report limits', () => {
  it('refuses a report with more records than the limit', () => {
    const lines = ['SKU\tError Code\tError Message'];
    for (let i = 0; i < MAX_REPORT_RECORDS + 5; i++) {
      lines.push('SKU-' + i + '\t90220\tsomething went wrong');
    }
    expect(() => parseAmazonReport(lines.join('\n'))).toThrow(/more than the/);
  });

  it('refuses a record larger than the limit', () => {
    const huge = 'x'.repeat(MAX_REPORT_RECORD_CHARS + 10);
    const report = 'SKU\tError Code\tError Message\nA-1\t90220\t' + huge;
    expect(() => parseAmazonReport(report)).toThrow(/larger than/);
  });

  it('refuses an error message longer than the limit', () => {
    const long = 'y'.repeat(MAX_REPORT_MESSAGE_CHARS + 10);
    const report = 'SKU\tError Code\tError Message\nA-1\t90220\t' + long;
    expect(() => parseAmazonReport(report)).toThrow(/longer than/);
  });

  it('refuses a JSON report with more records than the limit', () => {
    const many = { errors: Array.from({ length: MAX_REPORT_RECORDS + 1 }, (_, i) => ({ message: 'error ' + i })) };
    expect(() => parseAmazonReport(many)).toThrow(/more than the/);
  });

  it('handles a report with a byte order mark', () => {
    const report = '\uFEFFSKU\tError Code\tError Message\nA-1\t90220\tValue is not valid';
    const parsed = parseAmazonReport(report);
    expect(parsed?.errors).toHaveLength(1);
    expect(parsed?.errors[0].sku).toBe('A-1');
  });

  it('handles a report with quoted fields', () => {
    const report = 'SKU\tError Code\tError Message\n"A-1"\t90220\t"Value is not valid, and contains a comma"';
    const parsed = parseAmazonReport(report);
    expect(parsed?.errors).toHaveLength(1);
    expect(parsed?.errors[0].message).toBe('Value is not valid, and contains a comma');
  });

  it('ignores empty records', () => {
    const report = 'SKU\tError Code\tError Message\n\nA-1\t90220\tValue is not valid\n\n';
    const parsed = parseAmazonReport(report);
    expect(parsed?.errors).toHaveLength(1);
  });

  it('handles a report where the SKU is missing', () => {
    const report = 'SKU\tError Code\tError Message\n\t90220\tValue is not valid';
    const parsed = parseAmazonReport(report);
    expect(parsed?.errors).toHaveLength(1);
    expect(parsed?.errors[0].sku).toBeNull();
    expect(parsed?.errors[0].errorCode).toBe('90220');
  });

  it('keeps duplicate SKU entries as separate errors', () => {
    const report = 'SKU\tError Code\tError Message\nA-1\t90220\tFirst\nA-1\t90220\tSecond';
    const parsed = parseAmazonReport(report);
    expect(parsed?.errors).toHaveLength(2);
    expect(parsed?.errors.map((e) => e.message)).toEqual(['First', 'Second']);
  });

  it('handles a report with a comma delimited layout', () => {
    const report = 'SKU,Error Code,Error Message\nA-1,90220,Value is not valid';
    const parsed = parseAmazonReport(report);
    expect(parsed?.errors).toHaveLength(1);
    expect(parsed?.errors[0].errorCode).toBe('90220');
  });

  it('does not invent a code for a report that has none', () => {
    const report = 'SKU\tError Code\tError Message\nA-1\t\tSomething was reported';
    const parsed = parseAmazonReport(report);
    expect(parsed?.errors[0].errorCode).toBeNull();
  });
});
