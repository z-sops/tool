# M1b correction pass — security and integrity

Branch: `feat/m1b-security-integrity`, based on the M1b starting SHA
`af2ced60af06ce70a99e6a55c78c53d71b60e4d2` (Draft PR #4).

This pass addresses the independent M1b audit findings C1 to C8. The M1b feature
work is preserved: XLSX support, the Amazon template adapters, processing-report
matching, the correction workflow and their tests all remain. The changes are
corrections to that work, not a rewrite.

The guiding rule: **a seller must never receive a supposedly corrected listing
file that silently loses data, changes protected product information, or exports
unsafe spreadsheet content.**

---

## C1 — Lossless XLSX and template export

**Original failure.** The XLSX reader could truncate a sheet after 5,000 rows. The
interface turned the selected worksheet into a reduced table of detected headers
and the rows below them, and the corrected export serialised that reduced view as
CSV. Instruction rows above the header, other worksheets, workbook structure and
rows beyond the parser limit could all be discarded without the seller being told.

**Root cause.** The original file and the analysis view were the same object. There
was no mapping from the analysis view back to the source, so no export could state
what it did and did not contain, and nothing could detect that the source had not
been read completely.

**Implementation change.**

* `src/lib/bulk/source.ts` (new) separates the two. `AnalyzedTable` keeps the
  detected headers, the normalised rows, the records above the header, and the
  mapping `physicalRecords[i]` from a normalised row to its physical source
  record. It also records `droppedRecords`, `droppedColumns` and `lossy`.
* `planExport()` decides what an export may claim and returns the caveats the
  seller must see.
  * A source that could not be read completely is **refused**: "A corrected export
    was refused because the source could not be read completely (N row(s) …).
    Exporting now would silently lose data."
  * A CSV export is `source-complete-csv`: every record and column is included,
    including instruction rows, and it says that line endings and quoting are
    normalised.
  * A workbook export is `derived-sheet-csv` and says so plainly: it contains
    only the selected worksheet, cell formatting and Excel formulas are not
    represented, "the Amazon template structure of the workbook is not preserved",
    and how many other worksheets are missing.
* The page keeps the original `File` and re-serves its exact bytes for
  "Download original file (unchanged)".
* The corrected CSV is built from the source records with the approved corrections
  applied in place, so instruction rows survive.

**Remaining limitation.** A corrected XLSX is **not** produced. Writing a workbook
would need a ZIP writer and a template engine, and a partially written workbook is
worse than none. The capability is therefore blocked and the export is explicitly a
derived CSV, not an Amazon template file.

## C2 — Protected correction enforcement

**Original failure.** `applyCorrections()` trusted the correction objects handed
to it. A caller could pass a correction that replaced a SKU, a price or a
parent-child relationship, and it would be written into the cell.

**Root cause.** The invariants lived in `planCorrections()` only. The application
layer had no independent check.

**Implementation change.** `applyCorrections(table, columnRoles, corrections, approvedIds)`
now re-validates every correction against the actual source and refuses the whole
operation on the first violation. It checks that the correction is approved; that
its record and column exist; that its record matches the source position; that the
column's role is correctable; that its "before" value still equals the source
value; that its "after" value is one of the two supported transformations,
recomputed rather than trusted; and that no two corrections touch the same cell.
Nothing is skipped: a rejected correction aborts the export with an actionable
message.

Corrections also carry a `documentId`, a fingerprint of the source content, and the
identifier itself contains that fingerprint. An approval given for one file can
never authorise a correction in another, and a correction prepared for another
document is refused.

**Tests.** Forged corrections that replace a SKU, change a price, modify a
parent-child relationship, reference a missing row or column, carry a false
"before" value, change an unrelated text field, arrive without approval, reuse a
stale approval from another file, or are duplicated, are each rejected.

## C3 — CSV formula injection

**Original failure.** The inherited implementation scanned data cells but not
column headers, and its telephone-number exception was permissive enough to hide
arithmetic expressions.

**Root cause.** `PHONE_LIKE` allowed any hyphen or slash after the first digit,
so `+1-2` and `+1/2` were treated as telephone numbers and exported unflagged.

**Implementation change.** A telephone number must now be a leading plus, a digit,
and then only digits, spaces, dots and brackets, with a hyphen introducing a
group of two or more digits. `+1-555-0100` is a telephone number; `+1-2` and
`+1/2` are expressions and are flagged. Column headers are scanned with the same
rule as data cells, and a risky header blocks the export. Every finding now says
why it was flagged.

**Documentation.** The rule states that spreadsheet behaviour is not uniform — whether
a leading `=`, `+` or `@` is evaluated, and whether a formula is shown or
executed, differs between programs, versions and security settings — so the tool
assumes the worst case and refuses rather than silently rewriting.

**Coordination with M1a.** `src/lib/file-doctor.ts` is inherited from the M1a
review branch (Draft PR #3), so **PR #3 carries the same inherited weakness**.
This correction was applied to the M1b branch only; PR #3 was not modified. The
same change needs to be applied to `review/m1a-only` as a separate, labelled
update.

## C4 — Asynchronous upload race

**Original failure.** Selecting file A and then file B could leave A on screen:
A's read and parse were still in flight, and its late completion overwrote B.

**Root cause.** Every asynchronous path updated the state unconditionally.

**Implementation change.** `src/lib/bulk/operation.ts` (new) provides an
operation guard. Each file operation takes an identifier when it starts and checks
that it is still current after every await and before every state change; a
processing-report import additionally records the file operation it belongs to, so
a report loaded for a previous file is discarded when the file changes. Errors,
busy state, sheet selection, corrections and the original-download reference all
belong to the current file.

**Tests.** The guard is unit tested directly, and a browser test uploads a
4,000-row file and then a one-row file and asserts the one-row file stays on
screen and the slow file's SKUs never appear.

## C5 — Privacy network test integrity

**Original failure.** The privacy tests began recording requests after the upload
had been dispatched, so a leak that happened during the upload would not have
been seen. There was no negative control, so a broken recorder would have made the
assertions pass for the wrong reason.

**Root cause.** The recorder was attached too late and was never proved to work.

**Implementation change.** The recorder is installed **before** the file is
selected. It records anything that leaves the origin, any request that carries a
body, and any request whose query string looks like it carries file content. A
separate test asserts that the file content appears in no request body and in no
URL. A **negative control** performs a deliberate synthetic leak and asserts the
detector reports it, so the other assertions cannot pass vacuously.

## C6 — Processing-report resource limits

**Original failure.** The processing report had no size, record or message limits.

**Root cause.** The adapter read whatever it was given.

**Implementation change.** `src/lib/bulk/limits.ts` (new) holds the limits, which
both the error model and the report adapter use, so the two do not import each
other. The upload size is checked before the file is read. The number of records,
the size of a single record and the length of a single error message are all
bounded, and a report that exceeds a limit fails with a useful message rather than
being partly processed. The limits are exported and configurable.

**Tests.** Too many records, an over-long record, an over-long message, a byte order
mark, quoted fields, empty records, a missing SKU, duplicate SKUs, a comma
delimited layout and a report with no code are each covered.

## C7 — XLSX parser hardening

**Original failure.** `columnRefToIndex()` could return a negative value that was
then used as an index; duplicate cell coordinates and inconsistent worksheet
positions were not detected; and the uncompressed-size limit trusted the size the
archive declared, so an archive that lied about its sizes was not stopped.

**Root cause.** The archive was handed to a decompressor that was told to skip
entries it did not want, and the limits were checked against archive metadata that
the archive itself supplied.

**Implementation change.** The archive is now read through its own central
directory. Every entry's name, compression method and sizes are read and checked
before anything is inflated: unsafe paths, the ZIP64 size marker, an entry count
over the limit and a total over the limit are all refused. Each part is then
inflated with a hard cap on the produced bytes, so an entry that expands beyond
its limit never allocates the memory. The inflated result is checked against the
declared size, so an archive that lies is rejected. A cell reference that is not
a column reference, a cell that appears twice at the same coordinate, a column
beyond the sheet limit and a worksheet that points at a part which is not in the
archive are each refused with a specific error code.

**Remaining limitation.** The limit applies to the parts the tool reads. A part it
never opens, such as a large image, is neither inflated nor counted.

## C8 — Physical row-number accuracy

**Original failure.** Findings and corrections used a row number counted from the
detected header, so a file with instruction rows above its header reported
findings against the wrong source line.

**Root cause.** One coordinate was used for two different things: the position in
the source and the position in the analysis view.

**Implementation change.** Two coordinates are kept. `AnalyzedTable.physicalRecords`
maps a normalised row to its physical source record, and `inspectCsv()` accepts a
`firstDataRecord` and a `recordOf` mapping so that every finding, including a
header finding, carries the physical source row. Corrections carry both the
physical record and the normalised index, and the applier checks that they agree
with the source.

**Tests.** A finding in a file with instruction rows is reported against the
physical row, a header finding is reported against the header record, and a
processing-report error is matched to the physical row of the file.

---

## Verification

| Gate | Command | Result |
| --- | --- | --- |
| Clean install | `npm ci` | exit 0 |
| Types | `npm run typecheck` | exit 0, 0 errors |
| Unit | `npm run test:unit` | exit 0, **186 tests in 9 files** |
| Build | `npm run build` | exit 0, 450.64 kB / 115.02 kB gzip |
| Browser (E2E) run 1 | `npm run test:e2e` | exit 0, **368 passed / 0 flaky / 0 failed / 2 skipped** |
| Browser (E2E) run 2 | `npm run test:e2e` | exit 0, **368 passed / 0 flaky / 0 failed / 2 skipped** |

The E2E suite starts the production bundle on an isolated port (5181) and verifies
the ListingAI application identity before the first test:

```
[e2e preflight] ListingAI identity verified at http://127.0.0.1:5181
[e2e preflight] warmed 22 routes on http://127.0.0.1:5181
```

The 2 skips are the intentional desktop-only navigation tests.
