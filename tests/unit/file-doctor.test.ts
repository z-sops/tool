import { describe,it,expect } from 'vitest';
import { parseCsv,serializeCsv,inspectCsv,reviewedCsv,MAX_ROWS } from '../../src/lib/file-doctor';
describe('offline CSV File Doctor',()=>{
  it('handles BOM, quotes, commas and multiline',()=>{
    const csv=parseCsv('\uFEFFsku,title\r\n1,"A, ""great""\nitem"');
    expect(csv.rows).toEqual([['1','A, "great"\nitem']]);
    expect(parseCsv(serializeCsv(csv))).toEqual(csv);
  });
  it('rejects bad CSV and excessive rows',()=>{
    expect(()=>parseCsv(' ')).toThrow(/empty/);
    expect(()=>parseCsv('sku,title\n1,"bad')).toThrow(/Unclosed/);
    expect(()=>parseCsv('sku\n'+'A\n'.repeat(MAX_ROWS+1))).toThrow(/5,000/);
  });
  it('flags missing fields, duplicates and malformed price',()=>{
    const report=inspectCsv(parseCsv('item-sku,item-name,standard-price\nA,Good,12.00\nA,,nope\n,Item,10'));
    expect(report.issues.map(x=>x.code)).toEqual(expect.arrayContaining(['DUPLICATE_SKU','MISSING_TITLE','MISSING_SKU','PRICE_FORMAT']));
  });
  it('is only a preliminary check, not product type compliance',()=>{
    const report=inspectCsv(parseCsv('sku,notes\nA,hello'));
    expect(report.warnings.join(' ')).toContain('no official Amazon');
  });
  it('blocks formula risks and wrong-width rows',()=>{
    const formula=inspectCsv(parseCsv('sku,title\n1,=SUM(1)'));
    expect(formula.blocked).toBe(true);
    expect(()=>reviewedCsv(formula)).toThrow(/blocked/);
    expect(inspectCsv(parseCsv('sku,title\n1,A,extra')).blocked).toBe(true);
  });
  it('trims only approved text columns in export; preserves original',()=>{
    const csv=parseCsv('sku,title,price\n A ,  Nice  ,10.00');
    const output=parseCsv(reviewedCsv(inspectCsv(csv)));
    expect(output.rows[0]).toEqual([' A ','Nice','10.00']);
    expect(csv.rows[0][1]).toBe('  Nice  ');
  });
});
