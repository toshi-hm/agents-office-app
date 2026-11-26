import type { UpdateAgentInput } from '@agents-office-app/domain';
import { agentFields, readJsonBody, text } from '../parse-body.ts';
import type { JsonResponse, RouteServices } from './types.ts';

export async function updateAgent(
  id: string,
  request: Request,
  json: JsonResponse,
  { db, changed, requireOpen }: Pick<RouteServices, 'db' | 'changed' | 'requireOpen'>,
) {
  const input = await readJsonBody<UpdateAgentInput>(request, {
    ...agentFields,
    statusNote: (value) => value === null || text(value),
  });
  requireOpen();
  const agent = db.updateAgent(id, input);
  changed();
  return json({ agent });
}
