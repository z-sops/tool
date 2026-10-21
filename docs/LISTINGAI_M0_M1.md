# ListingAI — M0 audit and M1a delivery

## Scope and safety
Branch: feat/listingai-m1-file-doctor. Initial main SHA: 2ed6b7b4e6bc7f399efd26937d04c60a22698702.
No main changes, no deployment, no Amazon account credentials, no Gitee source import.

## M0 verified baseline
- React/Vite/TypeScript project. Eleven Amazon calculators/checkers in src/pages/tools.
- Amazon integrations are future/unavailable in provider registry, not live SP-API data.
- AI generation uses OpenRouter (api/generate.ts), with validation and quota hardening needed before public use.
- Explorer/Compare contain sample products. Other research tools rely on manual inputs and heuristic scoring.
- Browser saved research uses localStorage; privacy copy should be audited for accuracy.
- README says proprietary ZuniTech, root LICENSE file not found on main. Audit third-party dependencies separately.

## M1a implemented: /tools/amazon-bulk-file-doctor
- Browser-only CSV parser with BOM, RFC-style quotes, escaped quotes, multiline values.
- Max 5 MB / 5,000 data rows, format validation and SKU/title/price checks, root-cause grouping.
- Download row-level JSON report. Reviewed CSV requires explicit approval; trims only recognized title/description/bullet fields.
- Row width anomalies and spreadsheet formula risk block reviewed CSV export.
- Original input preserved. No browser storage, server transfer, external AI or Amazon calls.

## M1a verification (executed, not asserted)
Verified on the feature branch. Commands, exact outputs and failures are recorded in
docs/LISTINGAI_M1_VERIFICATION.md.

| Gate | Command | Result |
| --- | --- | --- |
| Clean install | `npm ci` | pass (lockfile was out of sync; regenerated and committed) |
| Types | `npm run typecheck` | pass, 0 errors |
| Unit | `npm run test:unit` | pass, 59 tests |
| Build | `npm run build` | pass, 61 modules, `dist/` produced |
| Browser (E2E) | `npm run test:e2e` | pass, 330 passed / 2 skipped / 0 failed |
| Browser demo | `node scripts/demo-file-doctor.mjs` | pass, desktop + mobile screenshots |

### Defects found by the M1a audit and fixed
1. `npm ci` failed on this branch: `package-lock.json` was out of sync with
   `package.json` (missing `@emnapi/core@1.11.3`, `@emnapi/runtime@1.11.3`,
   `@emnapi/wasi-threads@1.2.3`, `@vercel/build-utils@14.10.1`,
   `es-module-lexer@1.5.0`). The lockfile is now regenerated and committed.
2. The E2E suite silently reused a foreign application on port 3000 and reported 256
   false failures. Port selection is now isolated (see "Port isolation").
3. Formula-injection detection had both false negatives and false positives:
   `-1+1` and `-2+3+cmd|' /C calc'!A0` were **not** detected, while `+15551234567`,
   `+1-555-0100` and `+3` were flagged and blocked a legitimate export.
4. Oversized files were fully read into memory before the size limit was applied.
5. UTF-16 encoded files were decoded as UTF-8 and analysed as garbage instead of
   being rejected with an actionable message.
6. The download helper revoked the object URL immediately, which can cancel the
   download in some browsers.
7. Re-selecting the same file did not re-run the analysis (the input value was not reset).
8. The new tool route had no SEO entry (it served a generic title and `noindex`) and
   was missing from `public/sitemap.xml`.

## Port isolation (shared development machine)
This machine runs several independent applications at the same time, and port 3000 is
occupied by another project. ListingAI therefore never assumes a common port:

- `scripts/free-port.mjs` probes for a free port on 127.0.0.1.
- `scripts/run-e2e.mjs` resolves the port **once** and exports it as `LISTINGAI_TEST_PORT`.
  The port must be resolved once because Playwright loads `playwright.config.ts` in the
  main process *and* in every worker process; a port probed at config-load time resolves
  differently in each of them.
- `playwright.config.ts` uses `reuseExistingServer: false`, so a foreign server on the
  chosen port fails the run instead of silently producing false results.
- `tests/app-identity.spec.ts` asserts that the responding application is ListingAI.
- No process outside this repository is stopped, reconfigured or interfered with.

## Not yet implemented / not to claim
- XLSX uploads, Amazon multi-row template handling, variations/parent-child repair.
- Original-file-to-Amazon-processing-report matching or root-cause analysis of actual API errors.
- Current category requirements, SP-API seller authorization, publishing, read-back, listing monitoring, GEO score.
- Live deployment or production release. The build is verified locally only.

## Validation
Unit tests: `tests/unit/file-doctor.test.ts`. Browser tests: `tests/file-doctor.spec.ts`.
Run: `npm ci && npm run typecheck && npm run test:unit && npm run build && npm run test:e2e`.
M1b requires actual anonymized Amazon input and processing report examples.
M2 must pin and validate the Gitee SP-API Listing Builder source, license and Amazon API restrictions before integration.
