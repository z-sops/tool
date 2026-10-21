import { useState } from 'react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { parseCsv, inspectCsv, reviewedCsv, type Report } from '../../lib/file-doctor';

function saveFile(name: string, body: string, mime: string) {
  const url = URL.createObjectURL(new Blob([body], {type:mime}));
  const a = document.createElement('a'); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
export function BulkFileDoctorPage() {
  const [report,setReport]=useState<Report|null>(null);
  const [name,setName]=useState('bulk');
  const [error,setError]=useState('');
  const [approved,setApproved]=useState(false);
  const inspect = async (file?: File) => {
    setReport(null); setError(''); setApproved(false);
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) { setError('M1a supports CSV only. XLSX and Amazon results reports are not implemented yet.'); return; }
    try {
      const data=inspectCsv(parseCsv(await file.text()));
      setReport(data);
      setName(file.name.replace(/\.csv$/i,'').replace(/[^a-z0-9_-]/gi,'-').slice(0,64));
    } catch (e) { setError(e instanceof Error?e.message:'Unable to read file.'); }
  };
  const errors=report?.issues.filter(x=>x.severity==='error').length||0;
  const warnings=report?.issues.filter(x=>x.severity==='warning').length||0;
  const affected=report?new Set(report.issues.map(x=>x.row)).size:0;
  return <ToolLayout title="Amazon Bulk File Doctor" description="Browser-only CSV review, row-level errors and safe correction preview." backLink="/" backLabel="Back to Tools">
    <div className="p-5 sm:p-8 space-y-6">
      <p className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-950">
        <strong>Offline beta.</strong> Preliminary formatting and completeness checks only.
        Not an Amazon compliance verdict or seller-account verification. Your uploaded file stays in this browser tab; no server upload.
      </p>
      <div>
        <label className="block font-semibold mb-2" htmlFor="bulk-csv">Upload a CSV listing file</label>
        <input id="bulk-csv" type="file" accept=".csv,text/csv" className="w-full border rounded-lg p-3 text-sm"
          onChange={event=>{void inspect(event.target.files?.[0]);}} />
        <p className="text-xs text-gray-500 mt-2">Max 5 MB / 5,000 data rows. Standard single-header CSV only. Complex Amazon templates, XLSX, variations and processing-report matching are not yet supported.</p>
      </div>
      {error && <p role="alert" className="bg-red-50 text-red-800 p-3 rounded-lg">{error}</p>}
      {report && <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([['CSV rows',report.csv.rows.length],['Affected rows',affected],['Errors',errors],['Warnings',warnings]] as const).map(([label,value])=>
            <div className="border rounded-xl bg-gray-50 p-4" key={label}><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}
        </div>
        <section className="border border-amber-200 bg-amber-50 p-4 rounded-xl text-sm">
          <h2 className="font-bold mb-2">Scope / headers</h2>
          <ul className="list-disc pl-5">{report.warnings.map(x=><li key={x}>{x}</li>)}</ul>
        </section>
        <section>
          <h2 className="text-lg font-bold mb-2">Root-cause groups</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {report.groups.map(g=><div className="border rounded-lg p-3" key={g.cause}><p className="capitalize text-sm">{g.cause.replace(/-/g,' ')}</p><strong>{g.count} findings</strong></div>)}
            {report.groups.length===0 && <p className="text-sm text-green-700">No preliminary issues detected. Not Amazon approval.</p>}
          </div>
        </section>
        <section>
          <h2 className="text-lg font-bold mb-2">Issues (first 50)</h2>
          <div className="overflow-x-auto border rounded-xl"><table className="text-sm w-full text-left">
            <thead className="bg-gray-50"><tr><th className="p-3">Row</th><th className="p-3">Severity</th><th className="p-3">Field</th><th className="p-3">Reason</th></tr></thead>
            <tbody>{report.issues.slice(0,50).map((x,i)=><tr className="border-t" key={i}><td className="p-3">{x.row}</td><td className="p-3">{x.severity}</td><td className="p-3">{x.field}</td><td className="p-3">{x.detail}</td></tr>)}</tbody>
          </table></div>
        </section>
        <section className="border-t pt-5 space-y-3">
          <h2 className="text-lg font-bold">Downloads</h2>
          <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm" type="button"
            onClick={()=>saveFile(name+'-issues.json',JSON.stringify({
              type:'preliminary offline ListingAI review',file:name+'.csv',rows:report.csv.rows.length,
              warnings:report.warnings,groups:report.groups,issues:report.issues
            },null,2),'application/json')}>Download full issue report</button>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)} />
            I approve whitespace trimming in title, description and recognized bullet columns only; my original CSV is preserved.</label>
          <button type="button" disabled={!approved||report.blocked}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm disabled:bg-gray-300"
            onClick={()=>{try{saveFile(name+'-reviewed.csv',reviewedCsv(report),'text/csv;charset=utf-8');}catch(e){setError(e instanceof Error?e.message:'Export error');}}}>
            Download reviewed CSV (trim-only)</button>
          {report.blocked && <p role="alert" className="text-red-700 text-sm">Reviewed export blocked: malformed columns or spreadsheet-formula risk. Correct the original and rescan.</p>}
          <p className="text-xs text-gray-500">No missing product facts are invented. File not submitted to Amazon; recheck against the official category template.</p>
        </section>
      </>}
    </div>
  </ToolLayout>;
}
