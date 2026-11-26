import { buildDemoScenarioTasks, type DemoScenario } from '../demo-scenarios.ts';
import { oneOf, readJsonBody } from '../parse-body.ts';
import type { JsonResponse, RouteServices } from './types.ts';

async function runDemoScenario(kind: DemoScenario, { runner, snapshot }: Pick<RouteServices, 'runner' | 'snapshot'>) {
  if (kind === 'stop_all') {
    await runner.stopAll();
    return [];
  }
  const tasks = buildDemoScenarioTasks(kind, snapshot().agents);
  return runner.enqueue(tasks).map(({ id }) => id);
}

export async function launchDemoScenario(
  request: Request,
  json: JsonResponse,
  services: Pick<RouteServices, 'runner' | 'snapshot' | 'requireOpen'>,
) {
  const { kind = 'kickoff' } = await readJsonBody<{ kind?: DemoScenario }>(
    request, { kind: oneOf('kickoff', 'approval', 'stop_all') }, [], true,
  );
  services.requireOpen();
  return json({ ok: true, startedTaskIds: await runDemoScenario(kind, services) });
}
