-- Additive stock-lot pilot migration. Run AFTER existing 0000 migration.
-- Existing ListingAI/NicheScout tables and data are not modified.
CREATE TABLE IF NOT EXISTS "lot_suppliers" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
 "created_by" uuid NOT NULL REFERENCES "users"("id"),
 "company_name" varchar(180) NOT NULL, "city" varchar(100) NOT NULL,
 "province" varchar(100) NOT NULL, "contact_name" varchar(120),
 "contact_details" varchar(250), "license_number" varchar(100), "notes" text,
 "status" varchar(24) DEFAULT 'unverified' NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "lot_suppliers_workspace_idx" ON "lot_suppliers"("workspace_id");
CREATE TABLE IF NOT EXISTS "inventory_lots" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
 "supplier_id" uuid NOT NULL REFERENCES "lot_suppliers"("id"),
 "created_by" uuid NOT NULL REFERENCES "users"("id"),
 "product_name" varchar(180) NOT NULL, "category" varchar(100) NOT NULL,
 "origin" varchar(40) NOT NULL, "condition" varchar(40) NOT NULL,
 "quantity" integer NOT NULL, "minimum_order" integer NOT NULL,
 "split_allowed" boolean DEFAULT false NOT NULL,
 "unit_price_cny_minor" integer NOT NULL, "warehouse_location" varchar(250) NOT NULL,
 "evidence_urls" jsonb DEFAULT '[]'::jsonb NOT NULL, "notes" text,
 "status" varchar(24) DEFAULT 'unverified' NOT NULL,
 "verified_at" timestamp with time zone, "verification_note" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "inventory_lots_positive_qty" CHECK ("quantity" > 0 AND "minimum_order" > 0 AND "minimum_order" <= "quantity"),
 CONSTRAINT "inventory_lots_nonnegative_price" CHECK ("unit_price_cny_minor" >= 0)
);
CREATE INDEX IF NOT EXISTS "inventory_lots_workspace_idx" ON "inventory_lots"("workspace_id");
CREATE INDEX IF NOT EXISTS "inventory_lots_supplier_idx" ON "inventory_lots"("supplier_id");
CREATE INDEX IF NOT EXISTS "inventory_lots_status_idx" ON "inventory_lots"("status");
CREATE TABLE IF NOT EXISTS "buyer_demands" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
 "created_by" uuid NOT NULL REFERENCES "users"("id"),
 "product_name" varchar(180) NOT NULL, "category" varchar(100) NOT NULL,
 "quantity" integer NOT NULL, "max_budget_cny_minor" integer NOT NULL,
 "destination" varchar(150) NOT NULL,
 "buyer_name" varchar(120), "buyer_contact" varchar(200), "notes" text,
 "status" varchar(24) DEFAULT 'open' NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "buyer_demands_positive_values" CHECK ("quantity" > 0 AND "max_budget_cny_minor" > 0)
);
CREATE INDEX IF NOT EXISTS "buyer_demands_workspace_idx" ON "buyer_demands"("workspace_id");
CREATE TABLE IF NOT EXISTS "lot_review_events" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
 "lot_id" uuid NOT NULL REFERENCES "inventory_lots"("id"),
 "reviewer_id" uuid NOT NULL REFERENCES "users"("id"),
 "previous_status" varchar(24) NOT NULL,
 "next_status" varchar(24) NOT NULL,
 "notes" text,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "lot_review_events_workspace_idx" ON "lot_review_events"("workspace_id");
CREATE INDEX IF NOT EXISTS "lot_review_events_lot_idx" ON "lot_review_events"("lot_id");
