/** Offline CSV preflight. No Amazon API calls or compliance guarantees. */
export type Cause = 'formatting' | 'missing-information' | 'duplicate-data' | 'manual-review';
export type Issue = { row: number; field: string; code: string; severity: 'error'|'warning'; cause: Cause; detail: string };
export type Csv = { headers: string[]; rows: string[][] };
export type Report = { csv: Csv; issues: Issue[]; warnings: string[]; groups: { cause: Cause; count: number }[]; blocked: boolean };
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 5000;
const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]/g,'');
const aliases = (a: string[], choices: string[]) => a.findIndex(x => choices.map(norm).includes(norm(x)));

export function parseCsv(input: string): Csv {
  if (!input.trim()) throw new Error('CSV is empty.');
  if (new TextEncoder().encode(input).length > MAX_BYTES) throw new Error('CSV exceeds 5 MB.');
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const all: string[][] = [];
  let cells: string[] = [], cell = '', quoted = false, closed = false, touched = false;
  const nextCell = () => { cells.push(cell); cell = ''; closed = false; touched = false; };
  const nextRow = () => {
    nextCell();
    all.push(cells);
    if (all.length > MAX_ROWS + 1) throw new Error('CSV exceeds 5,000 data rows.');
    cells = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closed = true; }
      } else if (c === '\r' && text[i + 1] === '\n') { cell += '\n'; i++; }
      else cell += c;
    } else if (c === '"') {
      if (cell || touched || closed) throw new Error('Invalid CSV quote near character ' + (i + 1) + '.');
      quoted = true; touched = true;
    } else if (c === ',') nextCell();
    else if (c === '\r' || c === '\n') {
      nextRow();
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else {
      if (closed) throw new Error('Characters after closed CSV quote.');
      cell += c; touched = true;
    }
  }
  if (quoted) throw new Error('Unclosed CSV quote.');
  if (cells.length || cell || touched || closed) nextRow();
  if (!all.length || all[0].every(x => !x.trim())) throw new Error('Missing CSV header.');
  return { headers: all[0], rows: all.slice(1) };
}

export function serializeCsv(doc: Csv): string {
  const quote = (s: string) => /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  return [doc.headers, ...doc.rows].map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
}
export function inspectCsv(csv: Csv): Report {
  const sku = aliases(csv.headers, ['sku','seller-sku','item-sku']);
  const title = aliases(csv.headers, ['title','item-name','product-name','product-title']);
  const price = aliases(csv.headers, ['price','standard-price','your-price']);
  const warnings: string[] = [
    'Offline preliminary checks only: no official Amazon product-type schema, Seller Central status, variation or API processing report verification.'
  ];
  if (sku < 0) warnings.push('SKU column not recognized; SKU checks skipped.');
  if (title < 0) warnings.push('Title column not recognized; title checks skipped.');
  if (price < 0) warnings.push('Price column not recognized; price checks skipped.');
  if (new Set(csv.headers.map(norm)).size !== csv.headers.length) warnings.push('Duplicate header names. Verify CSV mapping manually.');
  const issues: Issue[] = [];
  const seen = new Map<string,number>();
  const add = (row: number, field: string, code: string, severity: Issue['severity'], cause: Cause, detail: string) => {
    issues.push({row,field,code,severity,cause,detail});
  };
  csv.rows.forEach((values,i) => {
    const row = i + 2;
    if (values.every(x => !x.trim())) { add(row,'(row)','BLANK_ROW','warning','formatting','Blank data row.'); return; }
    if (values.length !== csv.headers.length) add(row,'(row)','ROW_WIDTH','error','formatting','Column count does not match header.');
    if (sku >= 0) {
      const v = (values[sku] || '').trim();
      if (!v) add(row,csv.headers[sku],'MISSING_SKU','error','missing-information','SKU is empty.');
      else if (seen.has(v.toLowerCase())) add(row,csv.headers[sku],'DUPLICATE_SKU','warning','duplicate-data','SKU repeats row ' + seen.get(v.toLowerCase()) + '. Review variation relationships.');
      else seen.set(v.toLowerCase(),row);
    }
    if (title >= 0) {
      const v = values[title] || '';
      if (!v.trim()) add(row,csv.headers[title],'MISSING_TITLE','error','missing-information','Title is empty.');
      if (v.length > 200) add(row,csv.headers[title],'TITLE_LENGTH','warning','manual-review','Over 200 characters. Actual limits vary by product type/marketplace.');
    }
    if (price >= 0 && (values[price] || '').trim()) {
      const v = values[price].trim();
      if (!/^\d+(\.\d{1,2})?$/.test(v) || Number(v) <= 0) add(row,csv.headers[price],'PRICE_FORMAT','warning','formatting','Check price format and currency.');
    }
    values.forEach((v,col) => {
      const field = csv.headers[col] || 'extra-column-' + (col+1);
      if (v.trim() !== v) add(row,field,'EDGE_WHITESPACE','warning','formatting','Leading/trailing spaces detected.');
      if (/^\s*[=+@]/.test(v) || /^\s*-[^\d.\s]/.test(v)) add(row,field,'FORMULA_RISK','error','manual-review','Possible spreadsheet formula; sanitize input manually.');
    });
  });
  const counts = new Map<Cause,number>();
  issues.forEach(x => counts.set(x.cause,(counts.get(x.cause)||0)+1));
  return {
    csv,issues,warnings,
    groups: Array.from(counts,([cause,count])=>({cause,count})).sort((a,b)=>b.count-a.count),
    blocked: issues.some(x => x.code === 'ROW_WIDTH' || x.code === 'FORMULA_RISK'),
  };
}
export function reviewedCsv(report: Report): string {
  if (report.blocked) throw new Error('Export blocked: fix malformed rows or formula-risk content first.');
  const trimCols = report.csv.headers.map((h,i) => /^(title|itemname|productname|producttitle|description|productdescription|bulletpoint[1-9])$/.test(norm(h)) ? i : -1);
  return serializeCsv({headers:report.csv.headers.slice(),rows:report.csv.rows.map(row=>row.map((value,i)=>trimCols.includes(i)?value.trim():value))});
}
