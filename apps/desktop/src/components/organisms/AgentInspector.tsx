import type { Agent, ExecutionLog, OfficeSnapshot } from '@agents-office-app/domain';
import type { OfficeActions } from '../actions.ts';
import { AgentInspectorBody } from './AgentInspectorBody.tsx';
import { AgentInspectorHeader } from './AgentInspectorHeader.tsx';
import { OfficeOverviewPanel } from './OfficeOverviewPanel.tsx';

export function AgentInspector({
  snapshot,
  agent,
  logs,
  actions,
}: {
  snapshot: OfficeSnapshot | null;
  agent: Agent | null;
  logs: readonly ExecutionLog[];
  actions: OfficeActions;
}) {
  return (
    <aside className="inspector panel" aria-label={agent ? '社員の詳細' : 'オフィスの概要'}>
      {!snapshot ? (
        <p className="empty">読み込み中…</p>
      ) : agent ? (
        // Keyed so drafts and confirmations never carry over to another agent.
        <div key={agent.id} className="inspector__scroll">
          <AgentInspectorHeader
            agent={agent}
            activity={snapshot.agentActivities[agent.id] ?? 'idle'}
            onClose={() => actions.select(null)}
          />
          <AgentInspectorBody snapshot={snapshot} agent={agent} logs={logs} actions={actions} />
        </div>
      ) : (
        <OfficeOverviewPanel snapshot={snapshot} actions={actions} />
      )}
    </aside>
  );
}
