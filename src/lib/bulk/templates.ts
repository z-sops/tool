/**
 * Amazon listing template adapters (ListingAI M1b).
 *
 * IMPORTANT HONESTY CONSTRAINTS
 * 1. This module identifies *column semantics* from the headers a user
 *    uploaded. It does not encode Amazon's category requirements. Required
 *    field rules are only applied when a verified product-type schema is
 *    supplied through the schema registry. While that registry is empty the
 *    tool states that required-field validation is unavailable rather than
 *    inventing rules.
 * 2. There is no universal Amazon template. A file that cannot be mapped with
 *    confidence is reported as an explicit unsupported-format result; the tool
 *    never guesses.
 */

export type FieldRole =
  | 'sku'
  | 'title'
  | 'brand'
  | 'productType'
  | 'category'
  | 'description'
  | 'bulletPoints'
  | 'price'
  | 'quantity'
  | 'parentSku'
  | 'variationAttributes'
  | 'identifier'
  | 'unknown';

export interface FieldMapping {
  role: FieldRole;
  /** The original header text, unmodified. */
  header: string;
  index: number;
  /** 1-based bullet position for the bulletPoints role. */
  bulletIndex?: number;
}

export interface TemplateAdapter {
  id: string;
  label: string;
  summary: string;
  /** Confidence from 0 to 1 that this adapter matches the given headers. */
  detect(headers: string[]): number;
  /** Maps headers to semantic roles. */
  map(headers: string[]): FieldMapping[];
}

/**
 * The result of interpreting a template.
 *
 * A result is either `mapped` (the columns were understood) or `unsupported`
 * (they were not, and the original data must be preserved untouched).
 */
export type TemplateAnalysis =
  | {
      status: 'mapped';
      adapter: TemplateAdapter;
      confidence: number;
      mappings: FieldMapping[];
      unmappedHeaders: string[];
      /** Roles the adapter understands that are absent from this file. */
      missingRoles: FieldRole[];
    }
  | {
      status: 'unsupported';
      /** Human-readable explanation of why the file could not be interpreted. */
      reason: string;
      /** The best confidence any adapter reached, for transparency. */
      bestConfidence: number;
      unmappedHeaders: string[];
    };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const normalizeHeader = (header: string): string =>
  header.trim().toLowerCase().replace(/[\s_.\-#()/]+/g, '');

const indexOfAlias = (headers: string[], aliases: string[]): number => {
  const wanted = aliases.map(normalizeHeader);
  for (let i = 0; i < headers.length; i++) {
    if (wanted.includes(normalizeHeader(headers[i]))) return i;
  }
  return -1;
};

/* ------------------------------------------------------------------ */
/* Column aliases                                                      */
/* ------------------------------------------------------------------ */

export const SKU_ALIASES = ['sku', 'sellersku', 'itemsku', 'msku', 'merchantsku', 'productsku'];
export const TITLE_ALIASES = ['itemname', 'title', 'productname', 'producttitle', 'name'];
export const BRAND_ALIASES = ['brandname', 'brand', 'manufacturer', 'manufacturerbrand'];
export const PRODUCT_TYPE_ALIASES = ['producttype', 'itemtype', 'producttypename', 'template'];
export const CATEGORY_ALIASES = [
  'category',
  'browsenode',
  'recommendedbrowsenodes',
  'subcategory',
  'feedcategory',
  'department',
];
export const DESCRIPTION_ALIASES = ['productdescription', 'description', 'itemdescription', 'longdescription'];
export const PRICE_ALIASES = ['standardprice', 'price', 'yourprice', 'listingprice', 'itemprice', 'buyboxprice'];
export const QUANTITY_ALIASES = [
  'quantity',
  'qty',
  'inventoryquantity',
  'instockquantity',
  'availablequantity',
  'stock',
  'stockquantity',
];
export const PARENT_SKU_ALIASES = ['parentsku', 'parentagesku', 'parent', 'parentsellersku', 'parentasin'];
export const VARIATION_ALIASES = [
  'variation',
  'variationtheme',
  'variationvalue',
  'size',
  'color',
  'colour',
  'material',
  'style',
];

const bulletIndexOf = (header: string): number | undefined => {
  const match = normalizeHeader(header).match(/bulletpoint(\d+)/);
  return match ? Number.parseInt(match[1], 10) : undefined;
};

/* ------------------------------------------------------------------ */
/* Adapters                                                            */
/* ------------------------------------------------------------------ */

const amazonFlatFile: TemplateAdapter = {
  id: 'amazon-flat-file',
  label: 'Amazon flat-file upload',
  summary: 'One row per product with machine field names such as seller-sku, item-name and brand-name.',
  detect(headers) {
    const n = normalizeHeader;
    const has = (alias: string) => headers.some((h) => n(h) === alias);
    let score = 0;
    if (has('sellersku') || has('itemsellersku') || has('itemsku')) score += 0.5;
    if (has('itemname')) score += 0.4;
    if (has('brandname')) score += 0.15;
    if (has('producttype')) score += 0.05;
    if (has('standardprice')) score += 0.1;
    if (headers.some((h) => /bulletpoint\d+/.test(n(h)))) score += 0.1;
    return Math.min(score, 1);
  },
  map(headers) {
    const mappings: FieldMapping[] = [];
    const push = (role: FieldRole, index: number) => {
      if (index >= 0) mappings.push({ role, header: headers[index], index });
    };
    push('sku', indexOfAlias(headers, SKU_ALIASES));
    push('title', indexOfAlias(headers, TITLE_ALIASES));
    push('brand', indexOfAlias(headers, BRAND_ALIASES));
    push('productType', indexOfAlias(headers, PRODUCT_TYPE_ALIASES));
    push('category', indexOfAlias(headers, CATEGORY_ALIASES));
    push('description', indexOfAlias(headers, DESCRIPTION_ALIASES));
    push('price', indexOfAlias(headers, PRICE_ALIASES));
    push('quantity', indexOfAlias(headers, QUANTITY_ALIASES));
    push('parentSku', indexOfAlias(headers, PARENT_SKU_ALIASES));
    push('variationAttributes', indexOfAlias(headers, VARIATION_ALIASES));
    headers.forEach((header, index) => {
      const bullet = bulletIndexOf(header);
      if (bullet) mappings.push({ role: 'bulletPoints', header, index, bulletIndex: bullet });
    });
    return mappings;
  },
};

const amazonCategoryTemplate: TemplateAdapter = {
  id: 'amazon-category-template',
  label: 'Amazon category listing template',
  summary: 'A downloadable category template identified by product-type and template-id columns.',
  detect(headers) {
    const n = normalizeHeader;
    const has = (alias: string) => headers.some((h) => n(h) === alias);
    let score = 0;
    if (has('producttype')) score += 0.5;
    if (has('templateid')) score += 0.3;
    if (has('locale')) score += 0.1;
    if (has('feedcategory')) score += 0.15;
    if (has('itemsellersku') || has('sellersku') || has('itemsku')) score += 0.2;
    return Math.min(score, 1);
  },
  map(headers) {
    const mappings: FieldMapping[] = [];
    const push = (role: FieldRole, index: number) => {
      if (index >= 0) mappings.push({ role, header: headers[index], index });
    };
    push('productType', indexOfAlias(headers, PRODUCT_TYPE_ALIASES));
    push('sku', indexOfAlias(headers, SKU_ALIASES));
    push('title', indexOfAlias(headers, TITLE_ALIASES));
    push('brand', indexOfAlias(headers, BRAND_ALIASES));
    push('category', indexOfAlias(headers, CATEGORY_ALIASES));
    push('description', indexOfAlias(headers, DESCRIPTION_ALIASES));
    push('price', indexOfAlias(headers, PRICE_ALIASES));
    push('quantity', indexOfAlias(headers, QUANTITY_ALIASES));
    push('parentSku', indexOfAlias(headers, PARENT_SKU_ALIASES));
    headers.forEach((header, index) => {
      const bullet = bulletIndexOf(header);
      if (bullet) mappings.push({ role: 'bulletPoints', header, index, bulletIndex: bullet });
    });
    return mappings;
  },
};

const genericFlat: TemplateAdapter = {
  id: 'generic-flat',
  label: 'Generic single-table CSV',
  summary: 'A single header row where SKU and title columns could be recognised.',
  detect(headers) {
    const n = normalizeHeader;
    let score = 0;
    if (headers.some((h) => SKU_ALIASES.includes(n(h)))) score += 0.4;
    if (headers.some((h) => TITLE_ALIASES.includes(n(h)))) score += 0.4;
    if (headers.some((h) => BRAND_ALIASES.includes(n(h)))) score += 0.1;
    if (headers.some((h) => PRICE_ALIASES.includes(n(h)))) score += 0.1;
    // The generic adapter is a fallback: it must never outrank a recognised
    // Amazon template that also satisfies these columns.
    return Math.min(score, 0.8);
  },
  map(headers) {
    const mappings: FieldMapping[] = [];
    const push = (role: FieldRole, index: number) => {
      if (index >= 0) mappings.push({ role, header: headers[index], index });
    };
    push('sku', indexOfAlias(headers, SKU_ALIASES));
    push('title', indexOfAlias(headers, TITLE_ALIASES));
    push('brand', indexOfAlias(headers, BRAND_ALIASES));
    push('description', indexOfAlias(headers, DESCRIPTION_ALIASES));
    push('price', indexOfAlias(headers, PRICE_ALIASES));
    push('quantity', indexOfAlias(headers, QUANTITY_ALIASES));
    push('parentSku', indexOfAlias(headers, PARENT_SKU_ALIASES));
    headers.forEach((header, index) => {
      const bullet = bulletIndexOf(header);
      if (bullet) mappings.push({ role: 'bulletPoints', header, index, bulletIndex: bullet });
    });
    return mappings;
  },
};

export const TEMPLATE_ADAPTERS: TemplateAdapter[] = [amazonFlatFile, amazonCategoryTemplate, genericFlat];

/** Below this confidence the file is reported as an unsupported template. */
export const MIN_TEMPLATE_CONFIDENCE = 0.5;

/** Roles a usable listing file is expected to carry. */
export const EXPECTED_ROLES: FieldRole[] = ['sku', 'title'];

/**
 * Interprets the columns of a file.
 *
 * Returns an explicit `unsupported` result when no adapter is confident
 * enough, instead of guessing. The caller must keep the original data
 * unchanged in that case.
 */
export function analyseTemplate(headers: string[]): TemplateAnalysis {
  let best: TemplateAnalysis | null = null;
  let bestConfidence = 0;

  for (const adapter of TEMPLATE_ADAPTERS) {
    const confidence = adapter.detect(headers);
    if (confidence > bestConfidence) bestConfidence = confidence;
    if (confidence < MIN_TEMPLATE_CONFIDENCE) continue;
    if (!best || best.status !== 'mapped' || confidence > best.confidence) {
      const mappings = adapter.map(headers);
      const mapped = new Set(mappings.map((m) => m.index));
      const unmappedHeaders = headers.filter((_, index) => !mapped.has(index));
      const present = new Set(mappings.map((m) => m.role));
      const missingRoles = EXPECTED_ROLES.filter((role) => !present.has(role));
      best = {
        status: 'mapped',
        adapter,
        confidence,
        mappings,
        unmappedHeaders,
        missingRoles,
      };
    }
  }

  if (best && best.status === 'mapped') return best;

  return {
    status: 'unsupported',
    reason:
      bestConfidence > 0
        ? 'The column names could not be matched to a known listing template with enough confidence. ' +
          'No assumption has been made about what the columns mean.'
        : 'No column in this file resembles a listing template header. ' +
          'No assumption has been made about what the columns mean.',
    bestConfidence: Number(bestConfidence.toFixed(3)),
    unmappedHeaders: headers.slice(),
  };
}

/**
 * Index of the column that holds the SKU, or -1 when there is none.
 * Used to match processing-report errors back to the rows of the file.
 */
export function skuColumnIndex(headers: string[]): number {
  return indexOfAlias(headers, SKU_ALIASES);
}

/**
 * Index of the column that holds the parent SKU, or -1 when there is none.
 */
export function parentSkuColumnIndex(headers: string[]): number {
  return indexOfAlias(headers, PARENT_SKU_ALIASES);
}

/* ------------------------------------------------------------------ */
/* Product type schemas                                                */
/* ------------------------------------------------------------------ */

export interface SchemaAttribute {
  name: string;
  label: string;
}

export interface ProductTypeSchema {
  productType: string;
  marketplace: string;
  requiredAttributes: SchemaAttribute[];
  /** Where the schema came from, so the UI can cite the source. */
  source: string;
  /** ISO date the schema was verified against. */
  verifiedAt: string;
}

export interface ProductTypeSchemaRegistry {
  find(productType: string, marketplace?: string): ProductTypeSchema | undefined;
  readonly size: number;
}

/**
 * The registry shipped today is deliberately empty: no Amazon product-type
 * schema has been verified and bundled for this project yet. While it is
 * empty the tool must not claim to validate required fields.
 */
export const emptySchemaRegistry: ProductTypeSchemaRegistry = {
  find: () => undefined,
  size: 0,
};

/**
 * Builds a registry from schemas that were individually verified.
 * Nothing else may populate it.
 */
export function createSchemaRegistry(schemas: ProductTypeSchema[]): ProductTypeSchemaRegistry {
  const list = [...schemas];
  return {
    find(productType, marketplace) {
      const wanted = normalizeHeader(productType);
      return list.find(
        (schema) =>
          normalizeHeader(schema.productType) === wanted &&
          (!marketplace || schema.marketplace === marketplace),
      );
    },
    get size() {
      return list.length;
    },
  };
}
