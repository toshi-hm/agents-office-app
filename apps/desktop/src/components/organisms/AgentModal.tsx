import { useState } from 'react';
import type { Agent, Team } from '@agents-office-app/domain';
import { useDialogForm } from '../../hooks/useDialogForm.ts';
import { createAgentForm, validateAgentForm } from '../../lib/view/agent-form.ts';
import type { AgentForm } from '../../lib/view/agent-form.ts';
import { AgentFormFields } from '../molecules/AgentFormFields.tsx';
import { ModalDialog } from '../molecules/ModalDialog.tsx';

export function AgentModal({
  agent,
  teams,
  canBrowse,
  onPickDirectory,
  onSubmit,
  onClose,
}: {
  /** Undefined creates a new agent. */
  agent: Agent | undefined;
  teams: readonly Team[];
  canBrowse: boolean;
  onPickDirectory: (current: string) => Promise<string | null>;
  onSubmit: (form: AgentForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => createAgentForm(agent, teams));
  const { busy, error, submit, browse } = useDialogForm(onPickDirectory);
  const patch = (next: Partial<AgentForm>) => setForm((current) => ({ ...current, ...next }));

  return (
    <ModalDialog
      title={agent ? '社員を編集' : '社員を追加'}
      submitLabel={busy ? '保存中…' : agent ? '保存する' : '追加する'}
      canSubmit={!busy && validateAgentForm(form) === null}
      error={error}
      onSubmit={() => void submit(() => onSubmit(form))}
      onClose={onClose}
    >
      <AgentFormFields
        form={form}
        agent={agent}
        teams={teams}
        canBrowse={canBrowse}
        onPatch={patch}
        onBrowse={() =>
          browse(form.workspacePath, (workspacePath) => patch({ workspacePath }))
        }
      />
    </ModalDialog>
  );
}
