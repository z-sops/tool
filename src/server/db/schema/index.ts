import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer, uniqueIndex, index, pgEnum, primaryKey } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['owner', 'admin', 'member']);
export const planEnum = pgEnum('plan', ['free', 'starter', 'pro', 'enterprise']);
export const providerEnum = pgEnum('provider', ['manual', 'openrouter', 'unavailable']);
export const methodologyEnum = pgEnum('methodology', ['api-live', 'user-input', 'cached', 'estimated']);
export const analysisTypeEnum = pgEnum('analysis_type', ['profit', 'roi', 'pricing', 'ip', 'restriction', 'sourcing', 'listing', 'title', 'bullet', 'checklist', 'niche']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenHashIdx: uniqueIndex('sessions_token_hash_idx').on(table.tokenHash),
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
}));

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: planEnum('plan').default('free').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('workspaces_slug_idx').on(table.slug),
  ownerIdIdx: index('workspaces_owner_id_idx').on(table.ownerId),
}));

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: roleEnum('role').default('member').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workspaceUserIdx: uniqueIndex('workspace_members_workspace_user_idx').on(table.workspaceId, table.userId),
  workspaceIdIdx: index('workspace_members_workspace_id_idx').on(table.workspaceId),
  userIdIdx: index('workspace_members_user_id_idx').on(table.userId),
}));

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  data: jsonb('data').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workspaceIdIdx: index('projects_workspace_id_idx').on(table.workspaceId),
  createdAtIdx: index('projects_created_at_idx').on(table.createdAt),
}));

export const savedAnalyses = pgTable('saved_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  type: analysisTypeEnum('type').notNull(),
  productName: varchar('product_name', { length: 200 }).notNull(),
  inputs: jsonb('inputs').notNull(),
  result: jsonb('result').notNull(),
  provider: providerEnum('provider').default('manual').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }),
  confidence: integer('confidence'),
  methodology: methodologyEnum('methodology').default('user-input').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('saved_analyses_user_id_idx').on(table.userId),
  workspaceIdIdx: index('saved_analyses_workspace_id_idx').on(table.workspaceId),
  projectIdIdx: index('saved_analyses_project_id_idx').on(table.projectId),
  typeIdx: index('saved_analyses_type_idx').on(table.type),
}));

export const savedListings = pgTable('saved_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  productName: varchar('product_name', { length: 200 }).notNull(),
  listing: jsonb('listing').notNull(),
  provider: providerEnum('provider').default('manual').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('saved_listings_user_id_idx').on(table.userId),
  workspaceIdIdx: index('saved_listings_workspace_id_idx').on(table.workspaceId),
  projectIdIdx: index('saved_listings_project_id_idx').on(table.projectId),
}));

export const researchNotes = pgTable('research_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  tags: text('tags').array().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('research_notes_user_id_idx').on(table.userId),
  workspaceIdIdx: index('research_notes_workspace_id_idx').on(table.workspaceId),
  projectIdIdx: index('research_notes_project_id_idx').on(table.projectId),
}));

export const integrationConfigs = pgTable('integration_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: providerEnum('provider').notNull(),
  config: jsonb('config').notNull(),
  encryptedCredentials: text('encrypted_credentials'),
  isActive: boolean('is_active').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workspaceProviderIdx: uniqueIndex('integration_configs_workspace_provider_idx').on(table.workspaceId, table.provider),
  workspaceIdIdx: index('integration_configs_workspace_id_idx').on(table.workspaceId),
}));

export const apiUsageLog = pgTable('api_usage_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: providerEnum('provider').notNull(),
  endpoint: varchar('endpoint', { length: 200 }).notNull(),
  requestTokens: integer('request_tokens'),
  responseTokens: integer('response_tokens'),
  costUsd: integer('cost_usd'),
  status: integer('status').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('api_usage_log_user_id_idx').on(table.userId),
  workspaceIdIdx: index('api_usage_log_workspace_id_idx').on(table.workspaceId),
  providerIdx: index('api_usage_log_provider_idx').on(table.provider),
  createdAtIdx: index('api_usage_log_created_at_idx').on(table.createdAt),
}));

export const entitlements = pgTable('entitlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  feature: varchar('feature', { length: 100 }).notNull(),
  limit: integer('limit'),
  used: integer('used').default(0).notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).defaultNow().notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workspaceFeatureIdx: uniqueIndex('entitlements_workspace_feature_idx').on(table.workspaceId, table.feature),
  workspaceIdIdx: index('entitlements_workspace_id_idx').on(table.workspaceId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type SavedAnalysis = typeof savedAnalyses.$inferSelect;
export type NewSavedAnalysis = typeof savedAnalyses.$inferInsert;
export type SavedListing = typeof savedListings.$inferSelect;
export type NewSavedListing = typeof savedListings.$inferInsert;
export type ResearchNote = typeof researchNotes.$inferSelect;
export type NewResearchNote = typeof researchNotes.$inferInsert;
export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type NewIntegrationConfig = typeof integrationConfigs.$inferInsert;
export type ApiUsageLog = typeof apiUsageLog.$inferSelect;
export type NewApiUsageLog = typeof apiUsageLog.$inferInsert;
export type Entitlement = typeof entitlements.$inferSelect;
export type NewEntitlement = typeof entitlements.$inferInsert;

// Stock-lot pilot: isolated tables; existing listing/research records are untouched.
export const lotSuppliers = pgTable('lot_suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  companyName: varchar('company_name', { length: 180 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  province: varchar('province', { length: 100 }).notNull(),
  contactName: varchar('contact_name', { length: 120 }),
  contactDetails: varchar('contact_details', { length: 250 }),
  licenseNumber: varchar('license_number', { length: 100 }),
  notes: text('notes'),
  status: varchar('status', { length: 24 }).default('unverified').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => ({
  workspaceIdx: index('lot_suppliers_workspace_idx').on(table.workspaceId),
}));

export const inventoryLots = pgTable('inventory_lots', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id').notNull().references(() => lotSuppliers.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  productName: varchar('product_name', { length: 180 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  origin: varchar('origin', { length: 40 }).notNull(),
  condition: varchar('condition', { length: 40 }).notNull(),
  quantity: integer('quantity').notNull(),
  minimumOrder: integer('minimum_order').notNull(),
  splitAllowed: boolean('split_allowed').default(false).notNull(),
  unitPriceCnyMinor: integer('unit_price_cny_minor').notNull(),
  warehouseLocation: varchar('warehouse_location', { length: 250 }).notNull(),
  evidenceUrls: jsonb('evidence_urls').$type<string[]>().default([]).notNull(),
  notes: text('notes'),
  status: varchar('status', { length: 24 }).default('unverified').notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verificationNote: text('verification_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => ({
  workspaceIdx: index('inventory_lots_workspace_idx').on(table.workspaceId),
  supplierIdx: index('inventory_lots_supplier_idx').on(table.supplierId),
  statusIdx: index('inventory_lots_status_idx').on(table.status),
}));

export const buyerDemands = pgTable('buyer_demands', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  productName: varchar('product_name', { length: 180 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  quantity: integer('quantity').notNull(),
  maxBudgetCnyMinor: integer('max_budget_cny_minor').notNull(),
  destination: varchar('destination', { length: 150 }).notNull(),
  buyerName: varchar('buyer_name', { length: 120 }),
  buyerContact: varchar('buyer_contact', { length: 200 }),
  notes: text('notes'),
  status: varchar('status', { length: 24 }).default('open').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => ({
  workspaceIdx: index('buyer_demands_workspace_idx').on(table.workspaceId),
}));

/** Immutable status-change audit. The admin field desk is private to a workspace. */
export const lotReviewEvents = pgTable('lot_review_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  lotId: uuid('lot_id').notNull().references(() => inventoryLots.id),
  reviewerId: uuid('reviewer_id').notNull().references(() => users.id),
  previousStatus: varchar('previous_status', { length: 24 }).notNull(),
  nextStatus: varchar('next_status', { length: 24 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => ({
  workspaceIdx: index('lot_review_events_workspace_idx').on(table.workspaceId),
  lotIdx: index('lot_review_events_lot_idx').on(table.lotId),
}));
