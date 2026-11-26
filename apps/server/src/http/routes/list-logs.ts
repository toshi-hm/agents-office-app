import { OfficeError } from '../../db/error.ts';
import type { JsonResponse, RouteServices } from './types.ts';

export function listLogs(
  scope: 'task' | 'agent', id: string, url: URL, json: JsonResponse, { db }: Pick<RouteServices, 'db'>,
) {
  const raw = url.searchParams.get('limit') ?? '200';
  const limit = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(limit) || limit < 1) {
    throw new OfficeError(400, 'limit must be a positive integer');
  }
  return json({ logs: db.listLogs(scope, id, limit) });
}
