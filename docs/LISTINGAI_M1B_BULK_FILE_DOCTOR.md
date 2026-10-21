# Milestone M1b — Bulk File Doctor: XLSX, template intelligence, processing reports, safe corrections

Branch: `feat/m1b-bulk-file-doctor` (based on `review/m1a-only`,
`3c9513093cc16da7b22f53abc56dc68a47149ae9`).
No Amazon API integration and no category compliance verification is implemented.

The M1a File Doctor is preserved: the CSV parser, its findings, its approval-gated
export and the identity preflight are unchanged. M1b extends the same tool.

---

## 1. What was implemented

### A. XLSX support — `src/lib/bulk/xlsx.ts`

* Parses `.xlsx` in the browser. Nothing is uploaded: a browser test asserts that no
  request leaves the origin and no request carries a body while a workbook is analysed.
* **Multiple worksheets and sheet selection.** Every worksheet is listed; only the
  selected sheet is analysed.
* **Header identification.** The header row is detected rather than assumed, so
  instruction rows above the header are skipped and reported.
* **Formulas are never evaluated.** A formula cell keeps the value the file already
  stored. It is reported as `FORMULA_CACHED` (warning) when a value exists and
  `FORMULA_CELL` (error, blocks export) when it does not.
* **Malicious-cell handling.** Cells are classified for bidirectional override
  characters, control characters, zero-width characters and excessive length, and
  reported as `MALICIOUS_CELL`. Bidi override and control characters block the export.
* **Resource limits.** 10 MB input, 64 MB inflated, 2,000 archive entries, 50 sheets,
  5,000 rows per sheet, 200 columns, 32,768 characters per cell.
* **Only four XML parts are ever inflated**: `xl/workbook.xml`,
  `xl/_rels/workbook.xml.rels`, `xl/sharedStrings.xml` and the referenced
  `xl/worksheets/sheetN.xml`. Macros (`vbaProject.bin`), external links, embedded
  objects, media and drawings are never read, so their contents never reach the parser.
  Archive paths that try to escape the archive root are rejected.
* **Clear parsing errors.** Every failure carries a specific code: `NOT_A_ZIP`,
  `ZIP_CORRUPT`, `TOO_LARGE`, `TOO_MANY_ENTRIES`, `UNCOMPRESSED_LIMIT`,
  `NO_WORKBOOK`, `MALFORMED_XML`, `NO_SHEETS`, `SHEET_LIMIT`, `ROW_LIMIT`,
  `COLUMN_LIMIT`.
* A sheet that exceeds the row limit is **truncated, not rejected**, and the number of
  skipped rows is reported in the interface.

### B. Template intelligence — `src/lib/bulk/templates.ts`

Adapters recognise and map: **SKU and product identifiers, product type, category,
brand, title, bullet points, description, price, inventory quantity, variation
attributes and parent/child SKU relationships**.

| Adapter | Recognised by |
| --- | --- |
| `amazon-flat-file` | `seller-sku` / `item-sku` / `item-name` / `brand-name` / `standard-price` / `bullet-point1..n` |
| `amazon-category-template` | `product-type` / `template-id` / `locale` / `feed-category` |
| `generic-flat` | a SKU column and a title column, used only as a fallback and capped so it can never outrank a recognised Amazon template |

* There is **no universal Amazon template**. Each adapter scores its own signals and
  the highest scoring adapter wins.
* **Required attributes are not asserted.** Required-field validation is driven by a
  product-type schema registry that is deliberately **empty** (0 schemas). The
  interface states "Required-field validation is unavailable: no verified Amazon
  product-type schema is bundled", and a schema can only be added through
  `createSchemaRegistry()` for a schema that was individually verified.
* **An unmappable file returns an explicit unsupported result** — status `unsupported`
  with a reason and the best confidence reached — instead of a guess. The original data
  is preserved unchanged and no column meaning is assumed.

### C. Amazon processing report analyzer — `src/lib/bulk/amazon-errors.ts`

* A documented adapter interface plus one JSON adapter. **Error codes are never
  manufactured**: a code exists only when the supplied document contains one, and the
  raw record is preserved verbatim.
* **SKU-to-error matching.** Reported errors are matched to the rows of the source
  file by SKU. The result distinguishes errors that carry no SKU from errors whose SKU
  is not in the file.
* **Error classification** into `format`, `missing-attribute`, `invalid-value`,
  `relationship`, `category-requirement`, `brand-authorization` and `unknown`. The
  classification is explicitly labelled `listingai-heuristic`: it is ListingAI's own
  keyword heuristic, **not Amazon's taxonomy**.
* **Root-cause grouping** by error code, column and category, with the number of
  affected rows, the affected SKUs, a per-SKU breakdown and the source rows the group
  maps to.
* **Prioritisation** by severity and reach: `critical`, `high`, `medium`, `low`.
* **Suggested correction** per group, and an exportable review report.
* Source-file findings and Amazon-reported errors stay **separate origins**. A local
  finding never receives an Amazon error code.
* No adapter is marked `validatedAgainstAmazonOutput`. The bundled fixture is
  explicitly synthetic and labelled as such in the file and in the interface.

### D. Safe correction engine — `src/lib/bulk/corrections.ts`

Workflow: **original → analysis → proposed fix → before/after diff → user approval →
corrected export.**

* **No invented product facts.** Only whitespace and line endings that the user's own
  file contains are normalised.
* **No silent SKU changes.** Identifier, price, quantity, brand, product-type, category,
  parent-SKU and variation columns are in `PROTECTED_ROLES` and are never proposed for
  a change; the reason is shown to the user.
* **No unapproved variation changes** — variation columns are protected.
* **No automatic deletion of rows.** `applyCorrections` refuses to produce an export
  whose row count changed, and a correction that would drop a cell is rejected.
* **No unintended column loss.** The header count and every row's cell count are
  checked after the corrections are applied.
* **Original file preserved.** The user's file is never modified, and the interface
  offers "Download original file (unchanged)", which re-serves the exact bytes that
  were uploaded.
* **Reversible and deterministic.** Every correction records the exact `before` value
  and `revertCorrections()` restores it.
* **Explicit approval for every material correction.** Each correction has its own
  checkbox, and the export stays disabled until at least one is approved.
* **No automatic Amazon publishing.** Nothing is sent anywhere.

---

## 2. Defects found and fixed during M1b

| Defect | Fix |
| --- | --- |
| The Amazon flat-file adapter scored 0.75 while the generic fallback scored 0.80, so an Amazon flat file was reported as "generic" | Reweighted so the Amazon machine field names decide the match, and the generic adapter stays a capped fallback |
| With the new weights, the flat-file adapter then beat the category adapter on a category template | Made `template-id` and `locale` decisive for the category adapter and reduced the flat-file product-type weight |
| The approval checkbox was a controlled input that could not be ticked when the file had no corrections, so the export stayed permanently disabled | The master approval is now separate state, so the control behaves correctly in every case |
| The "no network request during analysis" assertion counted the application's own lazy chunk and failed | The assertion is now precise: no request to another origin and no request with a body, plus a check that the file contents appear in no request body |
| One e2e run in five left `#root` empty: the document loaded but React never mounted | The dev server transforms modules on demand, so under parallel load a module request can fail and the application never mounts. The suite now runs against the **production bundle** (`npm run build && vite preview`), which has no such failure mode, and the render diagnostic now reports the page state and the console errors |
| `fflate` added 40 kB to the initial bundle for every page | The decoder is now a dynamic import, and the whole Bulk File Doctor page is lazily loaded |

---

## 3. Verification

| Gate | Command | Result |
| --- | --- | --- |
| Clean install | `npm ci` | pass |
| Types | `npm run typecheck` | pass, 0 errors |
| Unit | `npm run test:unit` | pass, **119 tests in 7 files** |
| Build | `npm run build` | pass, 450.65 kB / 115.03 kB gzip |
| Browser (E2E) | `npm run test:e2e` | pass, **348 passed / 2 skipped / 0 failed**, twice consecutively |

The 2 skips are the intentional desktop-only navigation tests, skipped only on the
mobile project.

### Test harness

The e2e suite starts the production build (`npm run build && vite preview`) rather than the
dev server. Two reasons: the dev server transforms modules on demand, so under parallel load
a module request can fail and the application never mounts, which produced one flaky run in
five; and the built bundle is the artefact that actually ships, so the evidence is about
what users receive. The identity preflight was adjusted to markers that exist in both the
source and the built document.

### Browser demonstration

`scripts/demo-file-doctor.mjs` drives a real browser on an isolated port with
synthetic data only and writes screenshots and a `summary.json`.

### Bundle effect

| | Main bundle | Bulk File Doctor chunk | Workbook chunk |
| --- | --- | --- | --- |
| M1a | 460.28 kB / 118.46 kB gzip | (static) | — |
| M1b | **450.65 kB / 115.03 kB gzip** | 43.50 kB / 14.87 kB gzip | 7.85 kB / 3.84 kB gzip |

The other eleven tools and the marketing pages now load **less** JavaScript than
before M1b.

---

## 4. Limitations

* **No Amazon API integration and no category compliance verification.** No SP-API
  call, no Seller Central authorisation, no publishing, no read-back.
* **No verified Amazon product-type schema** is bundled, so required-field validation
  is not performed and the tool says so on screen.
* The processing-report adapter is **not validated against genuine Amazon output**.
  Only a synthetic fixture is bundled, and it is labelled as such.
* The error classification is ListingAI's own keyword heuristic, not Amazon's taxonomy.
* Multi-row Amazon category templates and variation parent/child repair are not
  implemented; the parent-SKU relationship is identified but not rewritten.
* The corrected export is CSV of the analysed sheet. The original workbook is
  preserved unchanged and can be downloaded as it was.
* `/create` generation is not covered end to end: the dev server has no
  `/api/generate` function.
* The e2e suite assumes a machine with a free port. An OS-level socket-buffer failure
  is possible on a heavily loaded host; it is environmental and bounded by one retry.
