import type { JsonResponse, RouteServices } from './types.ts';

export function getSnapshot(json: JsonResponse, { snapshot }: Pick<RouteServices, 'snapshot'>) {
  return json(snapshot());
}
