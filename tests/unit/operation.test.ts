import { describe, it, expect } from 'vitest';
import { createOperationGuard } from '../../src/lib/bulk/operation';

describe('operation guard', () => {
  it('gives every operation a new identifier', () => {
    const guard = createOperationGuard();
    const first = guard.begin();
    const second = guard.begin();
    expect(second).toBeGreaterThan(first);
    expect(guard.current()).toBe(second);
  });

  it('marks the most recent operation as current', () => {
    const guard = createOperationGuard();
    const first = guard.begin();
    expect(guard.isCurrent(first)).toBe(true);
    const second = guard.begin();
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it('rejects a late operation after a newer one started', () => {
    const guard = createOperationGuard();
    const slow = guard.begin();
    const fast = guard.begin();
    // The slow operation finishes last and must be recognised as stale.
    expect(guard.isCurrent(slow)).toBe(false);
    expect(guard.isCurrent(fast)).toBe(true);
  });

  it('keeps a report operation bound to the file operation it started with', () => {
    const fileOps = createOperationGuard();
    const reportOps = createOperationGuard();
    const fileOp = fileOps.begin();
    const reportOp = reportOps.begin();
    expect(fileOps.isCurrent(fileOp)).toBe(true);
    expect(reportOps.isCurrent(reportOp)).toBe(true);
    // A new file invalidates the report that belonged to the old file.
    fileOps.begin();
    expect(fileOps.isCurrent(fileOp)).toBe(false);
    expect(reportOps.isCurrent(reportOp)).toBe(true);
  });
});
