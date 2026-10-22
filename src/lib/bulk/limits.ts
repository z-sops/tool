/**
 * Shared resource limits for the bulk listing tools (ListingAI M1b, C6).
 *
 * They live in their own module so that the processing report adapter and the
 * error model can both use them without importing each other.
 */

/** Largest processing report that is read into memory. */
export const MAX_REPORT_BYTES = 5 * 1024 * 1024;
/** Largest number of records in a processing report. */
export const MAX_REPORT_RECORDS = 20_000;
/** Largest single record in a processing report. */
export const MAX_REPORT_RECORD_CHARS = 200_000;
/** Largest single error message in a processing report. */
export const MAX_REPORT_MESSAGE_CHARS = 10_000;
