import type { CreateAgentInput } from '@agents-office-app/domain';
import { agentFields, readJsonBody } from '../parse-body.ts';
import type { JsonResponse, RouteServices } from './types.ts';

export async function createAgent(
  request: Request, json: JsonResponse, { db, changed, requireOpen }: Pick<RouteServices, 'db' | 'changed' | 'requireOpen'>,
) {
  const input = await readJsonBody<CreateAgentInput>(request, agentFields, ['displayName', 'role', 'teamId', 'provider']);
  requireOpen();
  const agent = db.createAgent(input);
  changed();
  return json({ agent }, 201);
}
