import type { OfficeSnapshot } from '@agents-office-app/domain';
import { useDialogSubmit } from '../../hooks/useDialogSubmit.ts';
import type { DialogSubmitContext } from '../../hooks/useDialogSubmit.ts';
import type { ModalState } from '../../hooks/useModal.ts';
import type { TauriBridge } from '../../lib/tauri/types.ts';
import { getDefaultTargetAgentId } from '../../lib/view/group-agents.ts';
import { AgentModal } from './AgentModal.tsx';
import { TaskModal } from './TaskModal.tsx';

/** The form dialog that is currently open, wired to the backend. */
export function OfficeDialogs({
  snapshot,
  modal,
  selectedId,
  bridge,
  ...context
}: DialogSubmitContext & {
  snapshot: OfficeSnapshot;
  modal: NonNullable<ModalState>;
  selectedId: string | null;
  bridge: TauriBridge;
}) {
  const { submitTask, submitAgent } = useDialogSubmit(context);
  const pickDirectory = (current: string) =>
    bridge.pickWorkspaceDirectory(current || undefined);

  if (modal.type === 'task') {
    return (
      <TaskModal
        snapshot={snapshot}
        agentId={getDefaultTargetAgentId(snapshot.agents, modal.agentId ?? selectedId)}
        canBrowse={bridge.isNative}
        onPickDirectory={pickDirectory}
        onClose={context.close}
        onSubmit={submitTask}
      />
    );
  }
  const editing = snapshot.agents.find((agent) => agent.id === modal.agentId);
  // The agent being edited may have been removed meanwhile.
  if (modal.agentId && !editing) return null;
  return (
    <AgentModal
      agent={editing}
      teams={snapshot.teams}
      canBrowse={bridge.isNative}
      onPickDirectory={pickDirectory}
      onClose={context.close}
      onSubmit={(form) => submitAgent(editing, form)}
    />
  );
}
