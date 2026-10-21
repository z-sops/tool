import { describe, it, expect } from 'vitest';
import { splitDelimited, textProcessingReportAdapter } from '../../src/lib/bulk/text-processing-report';
import { parseAmazonReport } from '../../src/lib/bulk/amazon-errors';

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
