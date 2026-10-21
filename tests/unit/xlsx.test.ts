// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import {
  parseWorkbook,
  columnRefToIndex,
  classifyCell,
  XlsxError,
  MAX_XLSX_UNCOMPRESSED_BYTES,
  MAX_SHEETS,
  MAX_SHEET_ROWS,
  type XlsxSheet,
} from '../../src/lib/bulk/xlsx';

/** Builds a minimal but structurally valid .xlsx archive. */
function buildXlsx(
  sheets: { name: string; rows: string[][]; formulas?: Record<string, string> }[],
  extraParts: Record<string, string> = {},
): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const cellXml = (value: string, ref: string, formula?: string) => {
    const f = formula !== undefined ? `<f>${esc(formula)}</f>` : '';
    if (value === '') return `<c r="${ref}">${f}</c>`;
    return `<c r="${ref}" t="inlineStr">${f}<is><t xml:space="preserve">${esc(value)}</t></is></c>`;
  };

  sheets.forEach((sheet, index) => {
    const rows = sheet.rows
      .map((row, rowIndex) => {
        const cells = row
          .map((value, colIndex) => cellXml(value, colName(colIndex) + String(rowIndex + 1), sheet.formulas?.[`${rowIndex}:${colIndex}`]))
          .join('');
        return `<row r="${rowIndex + 1}">${cells}</row>`;
      })
      .join('');
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`,
    );
  });

  const sheetEntries = sheets
    .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  files['xl/workbook.xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries}</sheets></workbook>`,
  );
  const relEntries = sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('');
  files['xl/_rels/workbook.xml.rels'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relEntries}</Relationships>`,
  );
  files['[Content_Types].xml'] = strToU8(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`,
  );

  for (const [name, content] of Object.entries(extraParts)) files[name] = strToU8(content);

  return zipSync(files);
}

function colName(index: number): string {
  let name = '';
  let n = index;
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
}

describe('XLSX reader', () => {
  it('reads multiple worksheets with their names and cell values', async () => {
    const bytes = buildXlsx([
      { name: 'Listings', rows: [['sku', 'title'], ['A-1', 'Widget']] },
      { name: 'Notes', rows: [['note'], ['hello']] },
    ]);
    const workbook = await parseWorkbook(bytes);
    expect(workbook.sheets.map((s) => s.name)).toEqual(['Listings', 'Notes']);
    expect(workbook.sheets[0].rows.map((r) => r.map((c) => c.value))).toEqual([
      ['sku', 'title'],
      ['A-1', 'Widget'],
    ]);
  });

  it('reads shared strings', async () => {
    const files: Record<string, Uint8Array> = {
      'xl/sharedStrings.xml': strToU8(
        `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>alpha</t></si><si><r><t>be</t></r><r><t>ta</t></r></si></sst>`,
      ),
      'xl/workbook.xml': strToU8(
        `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
      'xl/_rels/workbook.xml.rels': strToU8(
        `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`,
      ),
      'xl/worksheets/sheet1.xml': strToU8(
        `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row></sheetData></worksheet>`,
      ),
    };
    const workbook = await parseWorkbook(zipSync(files));
    expect(workbook.sheets[0].rows[0].map((c) => c.value)).toEqual(['alpha', 'beta']);
  });

  it('never evaluates a formula and reports the value the file stored', async () => {
    const bytes = buildXlsx([{ name: 'S', rows: [['computed'], ['']], formulas: { '0:0': '1+1' } }]);
    const workbook = await parseWorkbook(bytes);
    const cell = workbook.sheets[0].rows[0][0];
    expect(cell.formula).toBe('1+1');
    expect(cell.value).toBe('computed');
    expect(cell.hasCachedValue).toBe(true);
  });

  it('flags a formula that has no stored result', async () => {
    const bytes = buildXlsx([{ name: 'S', rows: [['']], formulas: { '0:0': 'SUM(A1:A9)' } }]);
    const workbook = await parseWorkbook(bytes);
    const cell = workbook.sheets[0].rows[0][0];
    expect(cell.formula).toBe('SUM(A1:A9)');
    expect(cell.hasCachedValue).toBe(false);
  });

  it('never reads macros, external links, media or embedded objects', async () => {
    const bytes = buildXlsx([{ name: 'S', rows: [['a']] }], {
      'xl/vbaProject.bin': 'PK macro payload',
      'xl/externalLinks/externalLink1.xml': '<externalLink><ddeLink/></externalLink>',
      'xl/media/image1.png': 'binary',
      'xl/embeddings/oleObject1.bin': 'binary',
    });
    const workbook = await parseWorkbook(bytes);
    expect(workbook.sheets).toHaveLength(1);
    expect(workbook.sheets[0].rows[0][0].value).toBe('a');
  });

  it('rejects a file that is not a zip archive', async () => {
    await expect(parseWorkbook(strToU8('this is not a zip file at all'))).rejects.toBeInstanceOf(XlsxError);
  });

  it('rejects a zip that is not a workbook', async () => {
    await expect(parseWorkbook(zipSync({ 'readme.txt': strToU8('hello') }))).rejects.toMatchObject({ code: 'NO_WORKBOOK' });
  });

  it('rejects a workbook with malformed sheet XML', async () => {
    const rebuilt = zipSync({
      'xl/workbook.xml': strToU8(`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>`),
      'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`),
      'xl/worksheets/sheet1.xml': strToU8(`<?xml version="1.0"?><worksheet><sheetData><row><c`),
    });
    await expect(parseWorkbook(rebuilt)).rejects.toBeInstanceOf(XlsxError);
  });

  it('enforces the sheet count limit', async () => {
    const many = Array.from({ length: MAX_SHEETS + 1 }, (_, i) => ({ name: `S${i}`, rows: [['a']] }));
    await expect(parseWorkbook(buildXlsx(many))).rejects.toMatchObject({ code: 'SHEET_LIMIT' });
  });

  it('enforces the uncompressed size limit on the parts it reads', async () => {
    const huge = 'x'.repeat(MAX_XLSX_UNCOMPRESSED_BYTES + 1024);
    await expect(
      parseWorkbook(buildXlsx([{ name: 'S', rows: [['a']] }], { 'xl/sharedStrings.xml': huge })),
    ).rejects.toBeInstanceOf(XlsxError);
  });

  it('does not spend memory on parts it refuses to read', async () => {
    const huge = 'x'.repeat(MAX_XLSX_UNCOMPRESSED_BYTES + 1024);
    const workbook = await parseWorkbook(
      buildXlsx([{ name: 'S', rows: [['a']] }], { 'xl/media/huge.png': huge }),
    );
    expect(workbook.sheets[0].rows[0][0].value).toBe('a');
  });

  it('truncates a sheet that exceeds the row limit and reports how many rows were dropped', async () => {
    const rows = Array.from({ length: MAX_SHEET_ROWS + 5 }, () => ['v']);
    const workbook = await parseWorkbook(buildXlsx([{ name: 'Big', rows }]));
    const sheet = workbook.sheets[0] as XlsxSheet;
    expect(sheet.rows.length).toBe(MAX_SHEET_ROWS);
    expect(sheet.truncated).toBe(true);
    expect(sheet.truncatedRows).toBe(5);
    expect(sheet.sourceRowCount).toBe(MAX_SHEET_ROWS + 5);
  });

  it('converts column references', () => {
    expect(columnRefToIndex('A1')).toBe(0);
    expect(columnRefToIndex('B1')).toBe(1);
    expect(columnRefToIndex('Z1')).toBe(25);
    expect(columnRefToIndex('AA1')).toBe(26);
    expect(columnRefToIndex('BC12')).toBe(54);
  });
});

describe('XLSX cell content safety', () => {
  it('flags bidirectional override characters', () => {
    expect(classifyCell('Widget\u202Eexe')).toBe('bidi-override');
  });

  it('flags control characters but allows tab and newline', () => {
    expect(classifyCell('a\u0000b')).toBe('control-character');
    expect(classifyCell('a\tb\nc')).toBeNull();
  });

  it('flags zero-width characters but not emoji joiners', () => {
    expect(classifyCell('a\u200Bb')).toBe('zero-width');
    expect(classifyCell('a\u200Db')).toBeNull();
  });

  it('flags an over-long cell', () => {
    expect(classifyCell('x'.repeat(40_000))).toBe('too-long');
  });

  it('leaves ordinary content clean', () => {
    expect(classifyCell('Stainless Steel Water Bottle 24oz')).toBeNull();
    expect(classifyCell('')).toBeNull();
  });

  it('marks the risky cell when reading a workbook', async () => {
    const bytes = buildXlsx([{ name: 'S', rows: [['good', 'bad\u202Evalue']] }]);
    const workbook = await parseWorkbook(bytes);
    expect(workbook.sheets[0].rows[0][0].risk).toBeUndefined();
    expect(workbook.sheets[0].rows[0][1].risk).toBe('bidi-override');
  });
});
