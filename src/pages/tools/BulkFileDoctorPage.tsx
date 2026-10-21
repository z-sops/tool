import { useMemo, useState } from 'react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import {
  parseCsv,
  inspectCsv,
  serializeCsv,
  withIssues,
  MAX_BYTES,
  type Csv,
  type Issue,
  type Report,
} from '../../lib/file-doctor';
import { readWorkbookFile, XlsxError, MAX_XLSX_BYTES, type XlsxWorkbook } from '../../lib/bulk/xlsx';
import { detectHeaderRow, type HeaderDetection } from '../../lib/bulk/header';
import {
  analyseTemplate,
  emptySchemaRegistry,
  skuColumnIndex,
  type TemplateAnalysis,
  type FieldRole,
} from '../../lib/bulk/templates';
import {
  parseAmazonReport,
  groupErrors,
  matchErrorsToSource,
  errorKey,
  type AmazonProcessingReport,
  type SkuErrorMatch,
  type UnmatchedError,
} from '../../lib/bulk/amazon-errors';
import {
  planCorrections,
  applyCorrections,
  buildCorrectionReport,
  type ProposedCorrection,
} from '../../lib/bulk/corrections';
import syntheticFixture from '../../lib/bulk/fixtures/synthetic-processing-report.json';

function saveFile(name: string, body: string | BlobPart, mime: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

/** Reads only the first bytes so an oversized file is rejected before it is loaded. */
async function sniffEncoding(file: File): Promise<'utf16le' | 'utf16be' | 'utf8' | 'unknown'> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (head[0] === 0xff && head[1] === 0xfe) return 'utf16le';
  if (head[0] === 0xfe && head[1] === 0xff) return 'utf16be';
  if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) return 'utf8';
  return 'unknown';
}

const RISK_DETAIL: Record<string, string> = {
  'bidi-override': 'The cell contains bidirectional override characters, which can hide text from a human reviewer.',
  'control-character': 'The cell contains control characters that can break a CSV or truncate a value downstream.',
  'zero-width': 'The cell contains zero-width characters that hide text inside an apparently normal value.',
  'too-long': 'The cell is unusually long and was kept as-is.',
};

export function BulkFileDoctorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [csv, setCsv] = useState<Csv | null>(null);
  const [name, setName] = useState('bulk');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [workbook, setWorkbook] = useState<XlsxWorkbook | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [header, setHeader] = useState<HeaderDetection | null>(null);
  const [template, setTemplate] = useState<TemplateAnalysis | null>(null);
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [approveAll, setApproveAll] = useState(false);
  const [amazon, setAmazon] = useState<AmazonProcessingReport | null>(null);
  const [amazonNote, setAmazonNote] = useState('');
  const [matches, setMatches] = useState<SkuErrorMatch[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedError[]>([]);

  const columnRoles = useMemo(() => {
    if (!csv) return {} as Record<number, string>;
    const roles: Record<number, string> = {};
    if (template && template.status === 'mapped') {
      for (const mapping of template.mappings) roles[mapping.index] = mapping.role;
    }
    return roles;
  }, [csv, template]);

  const plan = useMemo(
    () => (csv ? planCorrections(csv.headers, csv.rows, columnRoles) : null),
    [csv, columnRoles],
  );

  const approvedCorrections = useMemo(
    () => (plan ? plan.corrections.filter((c) => approved[c.id]) : []),
    [plan, approved],
  );

  const groups = useMemo(
    () => groupErrors(report?.issues ?? [], amazon?.errors ?? []),
    [report, amazon],
  );

  const applySheet = (wb: XlsxWorkbook, index: number) => {
    const sheet = wb.sheets[index];
    if (!sheet) return;
    const grid = sheet.rows.map((row) => row.map((cell) => cell.value));
    const detection = detectHeaderRow(grid);
    const headerIndex = detection ? detection.headerRowIndex : 0;
    const headers = grid[headerIndex] ?? [];
    const rows = grid.slice(headerIndex + 1);

    // Findings that only exist for spreadsheet sources.
    const extra: Issue[] = [];
    sheet.rows.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const rowNumber = rowIndex - headerIndex + 2;
        if (rowNumber < 2) return;
        const field = headers[colIndex] ?? `column-${colIndex + 1}`;
        if (cell.formula !== undefined) {
          if (cell.hasCachedValue) {
            extra.push({
              row: rowNumber,
              field,
              code: 'FORMULA_CACHED',
              severity: 'warning',
              cause: 'manual-review',
              detail: 'The cell contains an Excel formula. The formula was not evaluated; the value stored in the file was used.',
            });
          } else {
            extra.push({
              row: rowNumber,
              field,
              code: 'FORMULA_CELL',
              severity: 'error',
              cause: 'manual-review',
              detail: 'The cell contains an Excel formula with no stored result. Replace it with a static value.',
            });
          }
        }
        if (cell.risk) {
          extra.push({
            row: rowNumber,
            field,
            code: 'MALICIOUS_CELL',
            severity: cell.risk === 'too-long' ? 'warning' : 'error',
            cause: 'manual-review',
            detail: RISK_DETAIL[cell.risk] ?? 'The cell content was flagged as risky.',
          });
        }
      });
    });

    const nextCsv: Csv = { headers, rows };
    const nextTemplate = analyseTemplate(headers);
    setCsv(nextCsv);
    setHeader(detection);
    setTemplate(nextTemplate);
    setReport(withIssues(inspectCsv(nextCsv), extra));
    setApproved({});
    setApproveAll(false);
    setMatches([]);
    setUnmatched([]);
  };

  const inspect = async (selected?: File) => {
    setReport(null);
    setCsv(null);
    setError('');
    setWorkbook(null);
    setTemplate(null);
    setAmazon(null);
    setAmazonNote('');
    setMatches([]);
    setUnmatched([]);
    setApproved({});
    setApproveAll(false);
    setFile(null);
    if (!selected) return;
    setBusy(true);
    try {
      const lower = selected.name.toLowerCase();
      const isXlsx = lower.endsWith('.xlsx');
      const isXls = lower.endsWith('.xls');
      if (isXls) {
        setError('Legacy .xls files are not supported. Save the workbook as .xlsx or export the sheet as UTF-8 CSV.');
        return;
      }
      if (!isXlsx && !lower.endsWith('.csv')) {
        setError('Unsupported file type. Only .csv and .xlsx files are analyzed in the browser. No data has been sent anywhere.');
        return;
      }
      const limit = isXlsx ? MAX_XLSX_BYTES : MAX_BYTES;
      if (selected.size > limit) {
        setError(`File is ${mb(selected.size)} MB. The limit is ${Math.round(limit / (1024 * 1024))} MB. The file was not loaded.`);
        return;
      }
      if (selected.size === 0) {
        setError('The selected file is empty.');
        return;
      }
      const stem =
        selected.name.replace(/\.(csv|xlsx)$/i, '').replace(/[^a-z0-9_-]/gi, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'bulk';
      setName(stem);
      setFile(selected);

      if (isXlsx) {
        const wb = await readWorkbookFile(selected);
        setWorkbook(wb);
        setSheetIndex(0);
        applySheet(wb, 0);
        return;
      }

      const encoding = await sniffEncoding(selected);
      if (encoding === 'utf16le' || encoding === 'utf16be') {
        setError('This file is UTF-16 encoded. Re-save it as UTF-8 CSV and upload it again. The file was not loaded.');
        return;
      }
      const parsed = parseCsv(await selected.text());
      const allRows = [parsed.headers, ...parsed.rows];
      const detection = detectHeaderRow(allRows);
      const nextCsv: Csv =
        detection && detection.headerRowIndex > 0
          ? { headers: allRows[detection.headerRowIndex], rows: allRows.slice(detection.headerRowIndex + 1) }
          : { headers: parsed.headers, rows: parsed.rows };
      setCsv(nextCsv);
      setHeader(detection);
      const nextTemplate = analyseTemplate(nextCsv.headers);
      setTemplate(nextTemplate);
      setReport(inspectCsv(nextCsv));
      setApproved({});
    } catch (e) {
      if (e instanceof XlsxError) setError(e.message);
      else setError(e instanceof Error ? e.message : 'Unable to read file.');
    } finally {
      setBusy(false);
    }
  };

  const loadAmazonReport = async (selected?: File, synthetic = false) => {
    setAmazon(null);
    setAmazonNote('');
    setMatches([]);
    setUnmatched([]);
    if (!selected && !synthetic) return;
    try {
      const raw = synthetic ? syntheticFixture : JSON.parse(await selected!.text());
      const parsed = parseAmazonReport(raw);
      if (!parsed) {
        setError('This document is not recognised as a processing report. The file was not used.');
        return;
      }
      setAmazon(parsed);
      setAmazonNote(
        synthetic
          ? 'Synthetic example loaded. These entries were invented for testing and are not Amazon output.'
          : 'This adapter has not been validated against genuine Amazon output. Codes are shown exactly as they appear in the supplied document.',
      );
      if (csv) {
        const skuColumn = skuColumnIndex(csv.headers);
        if (skuColumn < 0) {
          setMatches([]);
          setUnmatched(parsed.errors.map((error) => ({ error, reason: 'no-sku-in-report' as const })));
        } else {
          const result = matchErrorsToSource(parsed.errors, skuColumn, csv.rows);
          setMatches(result.matches);
          setUnmatched(result.unmatched);
        }
      }
    } catch {
      setError('That processing report could not be read as JSON.');
    }
  };

  const errors = report?.issues.filter((x) => x.severity === 'error').length || 0;
  const warnings = report?.issues.filter((x) => x.severity === 'warning').length || 0;
  const affected = report ? new Set(report.issues.map((x) => x.row)).size : 0;
  const sheet = workbook?.sheets[sheetIndex];

  const exportCorrectedCsv = () => {
    if (!csv) return;
    const corrected = applyCorrections(csv.headers, csv.rows, approvedCorrections);
    saveFile(name + '-corrected.csv', serializeCsv(corrected), 'text/csv;charset=utf-8');
  };

  const exportOriginal = async () => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    saveFile(file.name, buffer, file.type || 'application/octet-stream');
  };

  return (
    <ToolLayout
      title="Amazon Bulk File Doctor"
      description="Browser-only CSV and XLSX review, row-level errors and a safe correction preview."
      backLink="/"
      backLabel="Back to Tools"
    >
      <div className="p-5 sm:p-8 space-y-6">
        <p className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-950">
          <strong>Offline beta.</strong> Preliminary formatting and completeness checks only.
          Not an Amazon compliance verdict or seller-account verification. Your file stays in this browser tab; no server upload.
        </p>

        <div>
          <label className="block font-semibold mb-2" htmlFor="bulk-csv">Upload a listing file</label>
          <input
            id="bulk-csv"
            data-testid="file-doctor-upload"
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="w-full border rounded-lg p-3 text-sm"
            onChange={event => {
              const selected = event.target.files?.[0];
              event.target.value = '';
              void inspect(selected);
            }}
          />
          <p className="text-xs text-gray-500 mt-2">
            CSV up to 5 MB / 5,000 data rows. XLSX up to 10 MB, 50 sheets, 5,000 rows per sheet.
            Excel formulas are never evaluated and macros are never read. Nothing is uploaded.
          </p>
          {busy && <p className="text-xs text-gray-500 mt-2">Analyzing file locally&hellip;</p>}
        </div>

        {error && <p role="alert" data-testid="file-doctor-error" className="bg-red-50 text-red-800 p-3 rounded-lg">{error}</p>}

        {workbook && workbook.sheets.length > 1 && (
          <section className="border rounded-xl p-4">
            <label className="block font-semibold mb-2" htmlFor="sheet-select">Worksheet</label>
            <select
              id="sheet-select"
              data-testid="file-doctor-sheet"
              className="w-full border rounded-lg p-2 text-sm"
              value={sheetIndex}
              onChange={event => {
                const index = Number(event.target.value);
                setSheetIndex(index);
                applySheet(workbook, index);
              }}
            >
              {workbook.sheets.map((s, index) => (
                <option key={s.name + index} value={index}>
                  {s.name} ({s.rows.length} rows)
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              {workbook.sheets.length} worksheet(s) found. Only the selected sheet is analysed.
            </p>
          </section>
        )}

        {report && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([['CSV rows', report.csv.rows.length], ['Affected rows', affected], ['Errors', errors], ['Warnings', warnings]] as const).map(([label, value]) => (
                <div className="border rounded-xl bg-gray-50 p-4" key={label}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-2xl font-bold" data-testid={'stat-' + label.replace(/\s+/g, '-').toLowerCase()}>{value}</p>
                </div>
              ))}
            </div>

            <section className="border border-amber-200 bg-amber-50 p-4 rounded-xl text-sm">
              <h2 className="font-bold mb-2">Scope / headers</h2>
              <ul className="list-disc pl-5" data-testid="file-doctor-warnings">
                {report.warnings.map(x => <li key={x}>{x}</li>)}
              </ul>
            </section>

            {header && header.skippedRows > 0 && (
              <p className="text-sm text-gray-600" data-testid="file-doctor-header-note">
                Header row detected at row {header.headerRowIndex + 1}. {header.skippedRows} row(s) above it were skipped. {header.reason}
              </p>
            )}

            {sheet && sheet.truncated && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="file-doctor-truncation">
                Sheet &quot;{sheet.name}&quot; contains {sheet.sourceRowCount} rows. Only the first {sheet.rows.length} were analysed
                ({sheet.truncatedRows} row(s) beyond the 5,000 row limit were skipped).
              </p>
            )}

            <section className="border rounded-xl p-4" data-testid="file-doctor-template">
              <h2 className="font-bold mb-2">Template mapping</h2>
              {template && template.status === 'mapped' ? (
                <>
                  <p className="text-sm">
                    Matched <strong>{template.adapter.label}</strong> (confidence {Math.round(template.confidence * 100)}%). {template.adapter.summary}
                  </p>
                  <ul className="list-disc pl-5 text-sm mt-2" data-testid="file-doctor-roles">
                    {template.mappings.map(m => (
                      <li key={m.index + m.role}>"{m.header}" mapped to {m.role}{m.bulletIndex ? ` (bullet ${m.bulletIndex})` : ''}</li>
                    ))}
                  </ul>
                  {template.unmappedHeaders.length > 0 && (
                    <p className="text-sm mt-2">Not mapped: {template.unmappedHeaders.join(', ')}. Their values are preserved unchanged.</p>
                  )}
                  {template.missingRoles.length > 0 && (
                    <p className="text-sm mt-2 text-amber-800">Not found in this file: {template.missingRoles.join(', ')}.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-amber-800" data-testid="file-doctor-unsupported-template">
                  <strong>Unsupported template.</strong> {template?.reason}
                  {template ? ` Best confidence reached: ${Math.round(template.bestConfidence * 100)}%.` : ''}
                  {' '}Your original data is preserved unchanged and no column meaning has been assumed.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Required-field validation is unavailable: no verified Amazon product-type schema is bundled
                ({emptySchemaRegistry.size} schemas available). Category requirements are not asserted by this tool.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">Root-cause groups</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2" data-testid="file-doctor-groups">
                {report.groups.map(g => (
                  <div className="border rounded-lg p-3" key={g.cause}>
                    <p className="capitalize text-sm">{g.cause.replace(/-/g, ' ')}</p>
                    <strong>{g.count} findings</strong>
                  </div>
                ))}
                {report.groups.length === 0 && <p className="text-sm text-green-700">No preliminary issues detected. Not Amazon approval.</p>}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">Issues (first 50)</h2>
              <div className="overflow-x-auto border rounded-xl">
                <table className="text-sm w-full text-left">
                  <thead className="bg-gray-50"><tr><th className="p-3">Row</th><th className="p-3">Severity</th><th className="p-3">Field</th><th className="p-3">Reason</th></tr></thead>
                  <tbody data-testid="file-doctor-issues">
                    {report.issues.slice(0, 50).map((x, i) => (
                      <tr className="border-t" key={i}>
                        <td className="p-3">{x.row}</td>
                        <td className="p-3">{x.severity}</td>
                        <td className="p-3">{x.field}</td>
                        <td className="p-3">{x.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border rounded-xl p-4" data-testid="file-doctor-amazon">
              <h2 className="font-bold mb-2">Amazon processing report</h2>
              <p className="text-sm text-gray-600">
                Optional: load an Amazon processing report to compare it with your source file. Errors that the tool finds by itself
                are always listed as source-file findings and never receive an Amazon error code.
              </p>
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                <input
                  data-testid="file-doctor-amazon-upload"
                  type="file"
                  accept=".json,application/json"
                  className="text-sm"
                  onChange={event => {
                    const selected = event.target.files?.[0];
                    event.target.value = '';
                    void loadAmazonReport(selected);
                  }}
                />
                <button type="button" data-testid="file-doctor-amazon-sample" className="text-sm border rounded-lg px-3 py-1" onClick={() => void loadAmazonReport(undefined, true)}>
                  Load synthetic example
                </button>
              </div>
              {amazonNote && <p className="text-xs text-amber-800 mt-2" data-testid="file-doctor-amazon-note">{amazonNote}</p>}
              {amazon && (
                <div className="mt-3 space-y-2" data-testid="file-doctor-amazon-errors">
                  {groups.filter(g => g.origin === 'amazon-reported').map(g => (
                    <div key={g.key} className="border rounded-lg p-3 text-sm" data-testid="file-doctor-amazon-group">
                      <p className="font-semibold">
                        <span className="uppercase text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-800 mr-2">{g.priority}</span>
                        {g.errorCode ? `Error ${g.errorCode}` : 'Error without a code'} &middot; {g.affectedRows} affected row(s) &middot; {g.column ?? 'column unknown'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        ListingAI classification: {g.category} (heuristic, not Amazon&apos;s own taxonomy). Root cause: {g.rootCause}.
                      </p>
                      {g.sourceRows.length > 0 && (
                        <p className="text-xs text-gray-600">Matched source row(s): {g.sourceRows.join(', ')}.</p>
                      )}
                      {g.affectedSkus.length > 0 && (
                        <p className="text-xs text-gray-600">Affected SKUs: {g.affectedSkus.join(', ')}.</p>
                      )}
                      <p className="text-xs text-gray-600">Suggested correction: {g.suggestedCorrection}</p>
                    </div>
                  ))}
                  {groups.filter(g => g.origin === 'amazon-reported').length === 0 && (
                    <p className="text-sm">No Amazon-reported errors loaded.</p>
                  )}
                  {matches.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <p className="font-semibold">SKU matching ({matches.length} SKU(s) matched to the file):</p>
                      <ul className="list-disc pl-5">
                        {matches.slice(0, 20).map(m => (
                          <li key={m.sku + m.rows[0]}>
                            {m.sku} &rarr; row(s) {m.rows.join(', ')}, {m.errors.length} error(s)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {unmatched.length > 0 && (
                    <p className="text-xs text-amber-800">
                      {unmatched.length} reported error(s) could not be matched to a row: {unmatched.length} unmatched.
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="border rounded-xl p-4" data-testid="file-doctor-corrections">
              <h2 className="font-bold mb-2">Correction review</h2>
              {plan && (
                <p className="text-xs text-gray-600 mb-2" data-testid="file-doctor-safety">{plan.safety.note}</p>
              )}
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  data-testid="file-doctor-approve"
                  checked={approveAll}
                  onChange={e => {
                    setApproveAll(e.target.checked);
                    const next: Record<string, boolean> = {};
                    if (e.target.checked && plan) for (const c of plan.corrections) next[c.id] = true;
                    setApproved(next);
                  }}
                />
                {plan && plan.corrections.length > 0
                  ? 'I approve every proposed correction below. Identifiers and every other column are never altered.'
                  : 'No correction is proposed for this file, so the export would reproduce the uploaded values unchanged.'}
              </label>
              {plan && plan.corrections.length > 0 ? (
                <div className="overflow-x-auto border rounded-xl mt-2">
                  <table className="text-sm w-full text-left">
                    <thead className="bg-gray-50"><tr><th className="p-3">Apply</th><th className="p-3">Row</th><th className="p-3">Column</th><th className="p-3">Before</th><th className="p-3">After</th><th className="p-3">Reason</th></tr></thead>
                    <tbody>
                      {plan.corrections.map((c: ProposedCorrection) => (
                        <tr className="border-t" key={c.id}>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              data-testid={'correction-' + c.id}
                              checked={!!approved[c.id]}
                              onChange={e => setApproved(prev => ({ ...prev, [c.id]: e.target.checked }))}
                            />
                          </td>
                          <td className="p-3">{c.row}</td>
                          <td className="p-3">{c.column}</td>
                          <td className="p-3"><code className="break-all">{JSON.stringify(c.before)}</code></td>
                          <td className="p-3"><code className="break-all">{JSON.stringify(c.after)}</code></td>
                          <td className="p-3">{c.rationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-600 mt-2">No reversible correction is proposed for this file. Nothing is changed automatically.</p>
              )}
              {plan && plan.skipped.length > 0 && (
                <p className="text-xs text-gray-500 mt-2" data-testid="file-doctor-skipped">
                  {plan.skipped.length} cell(s) were left unchanged on purpose: {plan.skipped[0].reason}
                </p>
              )}
            </section>

            <section className="border-t pt-5 space-y-3">
              <h2 className="text-lg font-bold">Downloads</h2>
              <button data-testid="file-doctor-json" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm" type="button"
                onClick={() => saveFile(name + '-issues.json', JSON.stringify({
                  type: 'preliminary offline ListingAI review',
                  file: name,
                  rows: report.csv.rows.length,
                  headerRow: header ? header.headerRowIndex + 1 : 1,
                  template: template
                    ? template.status === 'mapped'
                      ? { id: template.adapter.id, confidence: template.confidence, roles: template.mappings.map(m => ({ header: m.header, role: m.role })) }
                      : { status: 'unsupported', reason: template.reason }
                    : null,
                  warnings: report.warnings,
                  groups: report.groups,
                  issues: report.issues,
                  errorGroups: groups,
                  amazonReport: amazon
                    ? {
                        adapterId: amazon.adapterId,
                        validatedAgainstAmazonOutput: amazon.validatedAgainstAmazonOutput,
                        errorCount: amazon.errors.length,
                        matchedSkus: matches.map(m => ({ sku: m.sku, rows: m.rows, errorCount: m.errors.length })),
                        unmatched: unmatched.map(u => ({ reason: u.reason, message: u.error.message })),
                      }
                    : null,
                }, null, 2), 'application/json')}>
                Download full issue report
              </button>
              {amazon && (
                <button data-testid="file-doctor-amazon-json" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm" type="button"
                  onClick={() => saveFile(name + '-amazon-report.json', JSON.stringify({
                    type: 'listingai processing report review',
                    generatedLocally: true,
                    adapterId: amazon.adapterId,
                    validatedAgainstAmazonOutput: amazon.validatedAgainstAmazonOutput,
                    notes: amazon.notes,
                    groups: groups.filter(g => g.origin === 'amazon-reported'),
                    matchedSkus: matches,
                    unmatched: unmatched.map(u => ({ reason: u.reason, error: u.error })),
                  }, null, 2), 'application/json')}>
                  Download processing-report review
                </button>
              )}
              <button data-testid="file-doctor-corrections-json" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm" type="button"
                onClick={() => {
                  if (!plan) return;
                  saveFile(name + '-corrections.json', JSON.stringify(
                    buildCorrectionReport(name, plan, approvedCorrections.map(c => c.id)), null, 2), 'application/json');
                }}>
                Download correction review report
              </button>
              <button type="button" data-testid="file-doctor-reviewed" disabled={report.blocked || !plan || (plan.corrections.length > 0 && approvedCorrections.length === 0)}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm disabled:bg-gray-300"
                onClick={exportCorrectedCsv}>
                Download corrected CSV ({approvedCorrections.length} approved)
              </button>
              {file && (
                <button type="button" data-testid="file-doctor-original" className="border rounded-lg px-4 py-2 text-sm"
                  onClick={() => void exportOriginal()}>
                  Download original file (unchanged)
                </button>
              )}
              {report.blocked && (
                <p role="alert" data-testid="file-doctor-blocked" className="text-red-700 text-sm">
                  Export blocked: malformed columns, spreadsheet-formula risk, an Excel formula with no stored value, or a cell with hidden characters.
                  Correct the original file and rescan.
                </p>
              )}
              <p className="text-xs text-gray-500">
                Nothing is published to Amazon and no product fact is invented. Corrections only normalise whitespace and line endings
                in columns you approved, no row is added or removed, and the original file is never modified.
              </p>
            </section>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
