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
- Max 5 MB / 5000 data rows, format validation and SKU/title/price checks, root-cause grouping.
- Download row-level JSON report. Reviewed CSV requires explicit approval; trims only recognized title/description/bullet fields.
- Row width anomalies and spreadsheet formula risk block reviewed CSV export.
- Original input preserved. No browser storage, server transfer, external AI or Amazon calls.

## Not yet implemented / not to claim
- XLSX uploads, Amazon multi-row template handling, variations/parent-child repair.
- Original-file-to-Amazon-processing-report matching or root-cause analysis of actual API errors.
- Current category requirements, SP-API seller authorization, publishing, read-back, listing monitoring, GEO score.
- Live deployment, production build verified by end-to-end tests.

## Validation
Unit tests: tests/unit/file-doctor.test.ts.
Run: npm ci && npm run typecheck && npm run test:unit && npm run build.
M1b requires actual anonymized Amazon input and processing report examples.
M2 must pin and validate the Gitee SP-API Listing Builder source, license and Amazon API restrictions before integration.
