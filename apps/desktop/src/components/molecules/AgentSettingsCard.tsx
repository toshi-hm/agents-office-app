import { Pencil, Trash2 } from 'lucide-react';
import type { Agent } from '@agents-office-app/domain';
import type { OfficeActions } from '../actions.ts';
import { ConfirmButton } from '../atoms/ConfirmButton.tsx';
import { AgentMetaGrid } from './AgentMetaGrid.tsx';
import { WorkspaceButtons } from './WorkspaceButtons.tsx';

export function AgentSettingsCard({ agent, actions }: { agent: Agent; actions: OfficeActions }) {
  return (
    <section className="card">
      <h3 className="section-title">設定</h3>
      <AgentMetaGrid agent={agent} />
      <WorkspaceButtons path={agent.workspacePath} actions={actions} />
      <div className="button-row button-row--end">
        <button type="button" className="button" onClick={() => actions.openAgentModal(agent.id)}>
          <Pencil size={13} aria-hidden="true" />
          編集
        </button>
        <ConfirmButton
          confirmLabel="本当に削除する"
          disabled={actions.isBusy(`delete:${agent.id}`)}
          onConfirm={() => actions.deleteAgent(agent.id)}
        >
          <Trash2 size={13} aria-hidden="true" />
          削除
        </ConfirmButton>
      </div>
    </section>
  );
}
