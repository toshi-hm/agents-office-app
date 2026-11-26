import type { Agent, ExecutionLog, OfficeSnapshot } from '@agents-office-app/domain';
import { getPendingApprovals } from '../../lib/view/summaries.ts';
import { getCurrentTask } from '../../lib/view/task-helpers.ts';
import type { OfficeActions } from '../actions.ts';
import { AgentSettingsCard } from '../molecules/AgentSettingsCard.tsx';
import { ApprovalCard } from '../molecules/ApprovalCard.tsx';
import { CurrentTaskCard } from '../molecules/CurrentTaskCard.tsx';
import { QuickTaskForm } from '../molecules/QuickTaskForm.tsx';

/** Approvals first, then asking for work, the current task and the agent's settings. */
export function AgentInspectorBody({
  snapshot,
  agent,
  logs,
  actions,
}: {
  snapshot: OfficeSnapshot;
  agent: Agent;
  logs: readonly ExecutionLog[];
  actions: OfficeActions;
}) {
  const approvals = getPendingApprovals(snapshot.approvals, agent.id);
  const task = getCurrentTask(snapshot.tasks, agent.id);
  const queued = snapshot.tasks.filter((t) => t.agentId === agent.id && t.status === 'queued');
  return (
    <>
      {approvals.map((approval) => (
        <ApprovalCard key={approval.id} approval={approval} actions={actions} />
      ))}
      <QuickTaskForm agent={agent} actions={actions} />
      <CurrentTaskCard task={task} queuedCount={queued.length} logs={logs} actions={actions} />
      <AgentSettingsCard agent={agent} actions={actions} />
    </>
  );
}
