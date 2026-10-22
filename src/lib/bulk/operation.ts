/**
 * Operation identity for asynchronous work (ListingAI M1b correction C4).
 *
 * A file is read and parsed asynchronously. If the seller selects file A and
 * then file B, A's work may still be in flight when B finishes. Without an
 * operation identity, the slower A could overwrite the newer B and the seller
 * would be shown a file they had already replaced.
 *
 * Every asynchronous operation takes an identifier when it starts and checks
 * that it is still the current one before it changes anything.
 */
export interface OperationGuard {
  /** Starts a new operation and returns its identifier. */
  begin(): number;
  /** True when the operation is still the most recent one. */
  isCurrent(operation: number): boolean;
  /** The identifier of the most recent operation. */
  current(): number;
}

export function createOperationGuard(): OperationGuard {
  let current = 0;
  return {
    begin() {
      current += 1;
      return current;
    },
    isCurrent(operation: number) {
      return operation === current;
    },
    current() {
      return current;
    },
  };
}
