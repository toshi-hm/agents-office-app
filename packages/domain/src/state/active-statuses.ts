import type { Execution } from '../types/index.ts';

export const ACTIVE_EXECUTION_STATUSES: ReadonlySet<Execution['status']> = new Set([
  'reserved',
  'starting',
  'active',
  'waiting_approval',
  'stopping',
]);
