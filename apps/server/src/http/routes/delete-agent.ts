import type { JsonResponse, RouteServices } from './types.ts';

export function deleteAgent(id: string, json: JsonResponse, { db, changed }: Pick<RouteServices, 'db' | 'changed'>) {
  db.deleteAgent(id);
  changed();
  return json({ ok: true });
}
