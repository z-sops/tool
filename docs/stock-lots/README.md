# ZuniTech Stock-Lot MVP — Phase 1

This module extends the existing NicheScout/ListingAI codebase, with no rename or deletion of existing content.

## Scope
China factory overstock, cancelled orders, export leftovers, discontinued items, and wholesale-clearance lots only. Amazon FBA, cross-border scraping, personal messaging, payments and autonomous negotiations are explicitly deferred.

## How to use
1. Configure PostgreSQL DATABASE_URL and existing app runtime, using the deployment's secure environment variables.
2. Before launching the feature, apply the additive SQL in `docs/stock-lots/001-stock-lots.sql` to the SAME database after baseline schema. Check and back up production first.
3. Start local Vite frontend and Vercel-compatible API host; Vite alone does not serve /api.
4. Navigate to `/stock-lots`, sign up/log in, create/select a workspace, and capture suppliers → lots → buyer requirements.
5. Lot availability and physical condition are not verified automatically. Administrator document review permits a lot to be published, but this is NOT a physical inspection certification.

## API
- `GET /api/stocklots?workspaceId=<uuid>&type=suppliers|lots|demands`
- `POST /api/stocklots?action=supplier|lot|demand|review`

All endpoints require authentication and workspace membership; review actions additionally require owner/admin roles. Prices are stored as integer CNY fen (hundredths), never float. Lot records are isolated from `saved_listings` (which holds marketing copy).
Do not expose contact details to a public marketplace by reusing the internal list endpoint.

## Known limitations
- No cloud object storage yet; photos accepted only as HTTPS evidence URLs and are not inspected automatically.
- Database migration is intentionally not automatically applied to production.
- 'Publish' requires document check and an evidence URL, not independent stock verification.
- No supplier-live data and no AI sourcing until a real authorized feed is established.
- Current rate limiter is process memory based, not production distributed enforcement.
- UI is internal-only and assumes the existing app auth/DB deployment is configured.
- Automated baseline build and browser tests still require CI or local execution.
