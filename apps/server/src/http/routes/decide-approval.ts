import type { ApprovalDecision } from '@agents-office-app/domain';
import { oneOf, readJsonBody } from '../parse-body.ts';
import type { JsonResponse, RouteServices } from './types.ts';

export async function decideApproval(
  id: string, request: Request, json: JsonResponse, { runner, requireOpen }: Pick<RouteServices, 'runner' | 'requireOpen'>,
) {
  const { decision } = await readJsonBody<{ decision: ApprovalDecision }>(request, { decision: oneOf('allow', 'deny') }, ['decision']);
  requireOpen();
  return json({ approval: runner.decide(id, decision) });
}
