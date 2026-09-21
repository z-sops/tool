import type { Plan } from './types';
import { isKnownFeature } from './config';

export * from './types';
export * from './config';
import { checkEntitlement } from './check';
export { checkEntitlement };
export type { CheckUsageInput } from './check';
