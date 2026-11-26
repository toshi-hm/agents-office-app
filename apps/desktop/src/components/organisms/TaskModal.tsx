import { useState } from 'react';
import type { CreateTaskInput, OfficeSnapshot } from '@agents-office-app/domain';
import { useDialogForm } from '../../hooks/useDialogForm.ts';
import { buildTaskInput, createTaskForm, retargetTaskForm } from '../../lib/view/task-form.ts';
import { ModalDialog } from '../molecules/ModalDialog.tsx';
import { TaskAssigneeField } from '../molecules/TaskAssigneeField.tsx';
import { TaskFormFields } from '../molecules/TaskFormFields.tsx';

export function TaskModal({
  snapshot,
  agentId,
  canBrowse,
  onPickDirectory,
  onSubmit,
  onClose,
}: {
  snapshot: OfficeSnapshot;
  agentId: string;
  canBrowse: boolean;
  onPickDirectory: (current: string) => Promise<string | null>;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
  onClose: () => void;
}) {
  const find = (id: string) => snapshot.agents.find((agent) => agent.id === id);
  // Captured once: snapshot refreshes must never overwrite what is being typed.
  const [form, setForm] = useState(() => createTaskForm(find(agentId)));
  const { busy, error, submit, browse } = useDialogForm(onPickDirectory);
  const agent = find(form.agentId);

  return (
    <ModalDialog
      title="仕事を依頼"
      submitLabel={busy ? '送信中…' : '依頼する'}
      canSubmit={!busy && Boolean(form.prompt.trim()) && Boolean(agent)}
      error={error}
      onSubmit={() => void submit(() => onSubmit(buildTaskInput(form)))}
      onClose={onClose}
    >
      <TaskAssigneeField
        teams={snapshot.teams}
        agents={snapshot.agents}
        value={form.agentId}
        onChange={(id) => setForm((current) => retargetTaskForm(current, find(id)))}
      />
      <TaskFormFields
        form={form}
        agent={agent}
        canBrowse={canBrowse}
        onUpdate={setForm}
        onBrowse={() =>
          browse(form.workspacePath, (workspacePath) =>
            setForm((current) => ({ ...current, workspacePath })),
          )
        }
      />
    </ModalDialog>
  );
}
