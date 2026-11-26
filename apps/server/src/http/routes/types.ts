import type { OfficeSnapshot } from '@agents-office-app/domain';
import type { OfficeDb } from '../../db/open-db.ts';
import type { createRunner } from '../../runner.ts';
import type { createSseHub } from '../sse-hub.ts';

export type JsonResponse = (value: unknown, status?: number) => Response;
export type RouteServices = {
  db: OfficeDb;
  runner: ReturnType<typeof createRunner>;
  snapshot: () => OfficeSnapshot;
  sse: ReturnType<typeof createSseHub>;
  changed: () => void;
  requireOpen: () => void;
};
