import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  serializeCsv,
  inspectCsv,
  reviewedCsv,
  isFormulaRisk,
  MAX_ROWS,
  MAX_BYTES,
  type Report,
} from '../../src/lib/file-doctor';

const codes = (r: Report) => r.issues.map((i) => i.code);
const issue = (r: Report, code: string) => r.issues.find((i) => i.code === code);

/** Build a CSV row without hand-rolled quoting. */
const csv = (headers: string[], rows: string[][]) =>
  serializeCsv({ headers, rows });

describe('File Doctor parser: CSV format handling', () => {
  it('1. parses UTF-8 BOM with CRLF line endings', () => {
    const parsed = parseCsv('\uFEFFsku,title\r\nA,"x"\r\nB,"y"\r\n');
    expect(parsed.headers).toEqual(['sku', 'title']);
    expect(parsed.rows).toEqual([['A', 'x'], ['B', 'y']]);
    expect(parsed.headers[0].charCodeAt(0)).not.toBe(0xfeff);
  });

  it('1b. parses LF-only files', () => {
    const parsed = parseCsv('sku,title\nA,B');
    expect(parsed.rows).toEqual([['A', 'B']]);
  });

  it('2. keeps commas inside quoted fields', () => {
    expect(parseCsv('sku,title\nA,"Hello, World"').rows[0][1]).toBe('Hello, World');
  });

  it('3. unescapes doubled double quotes', () => {
    expect(parseCsv('sku,title\nA,"He said ""hi"""').rows[0][1]).toBe('He said "hi"');
  });

  it('4. keeps multiline quoted values, normalising CRLF to LF', () => {
    expect(parseCsv('sku,title\nA,"line1\nline2"').rows[0][1]).toBe('line1\nline2');
    expect(parseCsv('sku,title\nA,"line1\r\nline2"').rows[0][1]).toBe('line1\nline2');
  });

  it('5. preserves empty fields and trailing commas', () => {
    expect(parseCsv('sku,title,price\nA,,10').rows[0]).toEqual(['A', '', '10']);
    const trailing = parseCsv('sku,title,price\nA,B,');
    expect(trailing.rows[0]).toEqual(['A', 'B', '']);
    expect(trailing.rows[0]).toHaveLength(3);
  });

  it('6. reports blank rows instead of silently dropping them', () => {
    const parsed = parseCsv('sku,title\nA,B\n\nC,D');
    expect(parsed.rows.length).toBe(3);
    const report = inspectCsv(parsed);
    expect(codes(report)).toContain('BLANK_ROW');
    expect(issue(report, 'BLANK_ROW')?.severity).toBe('warning');
  });

  it('7. rejects malformed quoting', () => {
    expect(() => parseCsv('sku,title\nA,"unclosed')).toThrow(/Unclosed/);
    expect(() => parseCsv('sku,title\nA,mid"quote')).toThrow(/Invalid CSV quote/);
    expect(() => parseCsv('sku,title\nA,"closed"trailing')).toThrow(/after closed/);
    expect(() => parseCsv('   ')).toThrow(/empty/i);
    expect(() => parseCsv('')).toThrow(/empty/i);
  });

  it('8. flags duplicate header names', () => {
    const report = inspectCsv(parseCsv('sku,sku,title\nA,B,C'));
    expect(report.warnings.join(' ')).toMatch(/Duplicate header/i);
  });

  it('8b. flags empty header names', () => {
    const report = inspectCsv(parseCsv('sku,,title\nA,B,C'));
    expect(report.warnings.join(' ')).toMatch(/header cells are empty/i);
  });

  it('9. flags rows whose column count differs from the header', () => {
    const report = inspectCsv(parseCsv('sku,title\nA,B,C\nD'));
    expect(codes(report)).toContain('ROW_WIDTH');
    expect(report.blocked).toBe(true);
  });

  it('10. enforces the row limit and the byte limit', () => {
    expect(() => parseCsv('sku\n' + 'A\n'.repeat(MAX_ROWS + 1))).toThrow(/5,000/);
    expect(parseCsv('sku\n' + 'A\n'.repeat(MAX_ROWS)).rows.length).toBe(MAX_ROWS);
    expect(() => parseCsv('x'.repeat(MAX_BYTES + 1))).toThrow(/5 MB/);
  });

  it('11. treats duplicate SKUs as a review hint, not a definitive violation', () => {
    const report = inspectCsv(parseCsv('sku,title\nA,One\nA,Two'));
    expect(issue(report, 'DUPLICATE_SKU')?.severity).toBe('warning');
    expect(issue(report, 'DUPLICATE_SKU')?.cause).toBe('duplicate-data');
    expect(report.blocked).toBe(false);
  });

  it('11b. duplicate SKUs differing only in case are also review hints', () => {
    const report = inspectCsv(parseCsv('sku,title\nA,One\na,Two'));
    expect(codes(report)).toContain('DUPLICATE_SKU');
    expect(report.blocked).toBe(false);
  });

  it('12. detects spreadsheet formula injection and blocks export', () => {
    const payloads = ['=1+1', '@SUM(A1)', '+1+1', '-1+1', "-cmd|' /C calc'!A0", "-2+3+cmd|' /C calc'!A0"];
    for (const payload of payloads) {
      const report = inspectCsv(parseCsv(csv(['sku', 'title'], [['A', payload]])));
      expect(codes(report), payload).toContain('FORMULA_RISK');
      expect(report.blocked, payload).toBe(true);
      expect(() => reviewedCsv(report), payload).toThrow(/blocked/);
    }
  });

  it('12b. does not treat signed numbers or phone numbers as formula risks', () => {
    const safe = ['-5', '+3', '-5.99', '+15551234567', '+1-555-0100', '- New Arrival', '10', 'Plain text'];
    for (const value of safe) {
      const report = inspectCsv(parseCsv(csv(['sku', 'title'], [['A', value]])));
      expect(codes(report), value).not.toContain('FORMULA_RISK');
      expect(report.blocked, value).toBe(false);
    }
  });

  it('12c. isFormulaRisk is a pure predicate', () => {
    expect(isFormulaRisk('=1')).toBe(true);
    expect(isFormulaRisk('  =1')).toBe(true);
    expect(isFormulaRisk('')).toBe(false);
    expect(isFormulaRisk('abc')).toBe(false);
    expect(isFormulaRisk('-5')).toBe(false);
  });

  it('12d. treats a signed arithmetic expression as a formula risk', () => {
    // A hyphen between single digits is subtraction and a slash is division,
    // so these are expressions, not telephone numbers.
    const payloads = ['+1-2', '+1/2', '-1/2', '+1-2+3', '-2/2', '+1-'];
    for (const payload of payloads) {
      const report = inspectCsv(parseCsv(csv(['sku', 'title'], [['A', payload]])));
      expect(codes(report), payload).toContain('FORMULA_RISK');
      expect(report.blocked, payload).toBe(true);
      expect(() => reviewedCsv(report), payload).toThrow(/blocked/);
    }
  });

  it('12e. keeps legitimate signed numbers and international phone numbers safe', () => {
    const safe = [
      '-5', '+3', '-5.99', '+15551234567', '-1,234.56', '+1-555-0100',
      '+44 20 7946 0000', '+1 (555) 010 0', '10', 'Plain text', '- New Arrival',
    ];
    for (const value of safe) {
      const report = inspectCsv(parseCsv(csv(['sku', 'title'], [['A', value]])));
      expect(codes(report), value).not.toContain('FORMULA_RISK');
      expect(report.blocked, value).toBe(false);
      expect(isFormulaRisk(value), value).toBe(false);
    }
  });

  it('12f. flags a formula-risk column header and blocks the export', () => {
    const report = inspectCsv(parseCsv(csv(['sku', '=cmd|calc'], [['A-1', 'Widget']])));
    expect(codes(report)).toContain('FORMULA_RISK');
    // The header is physical CSV record 1.
    expect(issue(report, 'FORMULA_RISK')?.row).toBe(1);
    expect(issue(report, 'FORMULA_RISK')?.field).toBe('=cmd|calc');
    expect(report.blocked).toBe(true);
    expect(() => reviewedCsv(report)).toThrow(/blocked/);
  });

  it('12g. flags only the unsafe header of a mixed header row', () => {
    const report = inspectCsv(parseCsv(csv(['sku', '=1+1', 'title'], [['A-1', 'Widget', 'W']])));
    const formulaIssues = report.issues.filter((i) => i.code === 'FORMULA_RISK');
    expect(formulaIssues).toHaveLength(1);
    expect(formulaIssues[0].field).toBe('=1+1');
    expect(formulaIssues[0].row).toBe(1);
    expect(report.blocked).toBe(true);
  });

  it('12h. does not flag safe headers', () => {
    const report = inspectCsv(parseCsv(csv(['sku', 'title', 'price'], [['A-1', 'Widget', '10.00']])));
    expect(codes(report)).not.toContain('FORMULA_RISK');
    expect(report.blocked).toBe(false);
  });

  it('12i. never removes, escapes or modifies the source when a header is refused', () => {
    const source = csv(['sku', '=1+1'], [['A-1', '  Widget  ']]);
    const parsed = parseCsv(source);
    const report = inspectCsv(parsed);
    expect(() => reviewedCsv(report)).toThrow(/blocked/);
    // The seller's data is exactly as it was read: nothing escaped or dropped.
    expect(parsed.headers).toEqual(['sku', '=1+1']);
    expect(parsed.rows).toEqual([['A-1', '  Widget  ']]);
    expect(report.csv.headers).toEqual(['sku', '=1+1']);
    expect(report.csv.rows).toEqual([['A-1', '  Widget  ']]);
    expect(source).toContain('=1+1');
  });

  it('12j. leaves the normal reviewed export working', () => {
    const report = inspectCsv(parseCsv(csv(['sku', 'title'], [['A-1', '  Widget  ']])));
    expect(report.blocked).toBe(false);
    const reviewed = reviewedCsv(report);
    expect(reviewed).toContain('Widget');
    expect(reviewed).not.toContain('  Widget  ');
  });

  it('13. round-trips through serializeCsv', () => {
    const parsed = parseCsv('\uFEFFsku,title\nA,"x, ""y"""\nB,z');
    expect(parseCsv(serializeCsv(parsed))).toEqual(parsed);
  });

  it('14. reports missing values, malformed price and empty headers', () => {
    const report = inspectCsv(parseCsv('item-sku,item-name,standard-price\nA,Good,12.00\nA,,nope\n,Item,10'));
    expect(codes(report)).toEqual(expect.arrayContaining(['DUPLICATE_SKU', 'MISSING_TITLE', 'MISSING_SKU', 'PRICE_FORMAT']));
  });

  it('15. states that it is not a compliance check', () => {
    const report = inspectCsv(parseCsv('sku,notes\nA,hello'));
    expect(report.warnings.join(' ')).toContain('no official Amazon');
  });

  it('16. groups findings by root cause with correct counts', () => {
    const report = inspectCsv(parseCsv('sku,title,price\nA,,nope\nA,,nope2'));
    const total = report.groups.reduce((sum, g) => sum + g.count, 0);
    expect(total).toBe(report.issues.length);
    const duplicate = report.groups.find((g) => g.cause === 'duplicate-data');
    expect(duplicate?.count).toBe(1);
  });

  it('17. reviewed export trims only approved text columns and leaves the source untouched', () => {
    const parsed = parseCsv('sku,title,price\n A ,  Nice  ,10.00');
    const report = inspectCsv(parsed);
    const output = parseCsv(reviewedCsv(report));
    expect(output.rows[0]).toEqual([' A ', 'Nice', '10.00']);
    expect(parsed.rows[0][1]).toBe('  Nice  ');
  });

  it('18. reviewed export never alters identifiers', () => {
    const parsed = parseCsv('sku,title\n  SKU-1  ,T');
    const report = inspectCsv(parsed);
    const output = parseCsv(reviewedCsv(report));
    expect(output.rows[0][0]).toBe('  SKU-1  ');
  });

  it('19. reviewed export is blocked by malformed rows and by formula risk', () => {
    expect(() => reviewedCsv(inspectCsv(parseCsv('sku,title\n1,A,extra')))).toThrow(/blocked/);
    expect(() => reviewedCsv(inspectCsv(parseCsv('sku,title\n1,=SUM(1)')))).toThrow(/blocked/);
  });

  it('20. a clean file produces no issues and no blocking', () => {
    const report = inspectCsv(parseCsv('sku,title,price\nA,Widget,10.00\nB,Gadget,20.00'));
    expect(report.issues).toHaveLength(0);
    expect(report.groups).toHaveLength(0);
    expect(report.blocked).toBe(false);
  });
});
