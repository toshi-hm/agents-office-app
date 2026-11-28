import type { JsonResponse, RouteServices } from './types.ts';

export async function stopTask(id: string, json: JsonResponse, { runner }: Pick<RouteServices, 'runner'>) {
  return json({ task: await runner.stop(id) });
}
