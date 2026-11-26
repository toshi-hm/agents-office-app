import type { CreateTaskInput } from '@agents-office-app/domain';
import { readJsonBody, taskFields } from '../parse-body.ts';
import type { JsonResponse, RouteServices } from './types.ts';

export async function createTask(
  request: Request, json: JsonResponse, { runner, requireOpen }: Pick<RouteServices, 'runner' | 'requireOpen'>,
) {
  const input = await readJsonBody<CreateTaskInput>(request, taskFields, ['title', 'prompt', 'agentId']);
  requireOpen();
  const [task] = runner.enqueue([input]);
  return json({ task }, 201);
}
