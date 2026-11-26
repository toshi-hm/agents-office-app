import type { Agent } from '@agents-office-app/domain';
import { OfficeError } from '../db/error.ts';

export type DemoScenario = 'kickoff' | 'approval' | 'stop_all';

export function buildDemoScenarioTasks(kind: Exclude<DemoScenario, 'stop_all'>, agents: readonly Agent[]) {
  const demo = agents.find((agent) => agent.provider === 'demo') ?? agents[0];
  if (!demo) throw new OfficeError(409, 'Create an agent before launching a demo');
  return kind === 'approval'
    ? [{ title: '成果物の公開', prompt: '成果物を確認し、公開の承認を依頼してください。', agentId: demo.id, provider: 'demo' } as const]
    : [demo, ...agents.filter(({ id }) => id !== demo.id)].slice(0, 4).map((agent) => ({
        title: agent.teamName + 'の業務開始',
        prompt: '今日の優先事項と最初の作業を整理してください。',
        agentId: agent.id,
        provider: 'demo' as const,
      }));
}
