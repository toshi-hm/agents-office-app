import { useState } from 'react';
import { ROLE_LABELS } from '@agents-office-app/domain';
import type { CreateTaskInput, OfficeSnapshot } from '@agents-office-app/domain';
import { describeError } from '../lib/tauri-bridge.ts';
import {
  TITLE_LIMIT,
  buildTaskInput,
  changeTaskProvider,
  createTaskForm,
  deriveTaskTitle,
  groupAgentsByTeam,
  retargetTaskForm,
} from '../lib/view-helpers.ts';
import { ProviderModelFields, WorkspaceField } from './fields.tsx';
import { Modal } from './Modal.tsx';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agent = find(form.agentId);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(buildTaskInput(form));
    } catch (failure) {
      setError(describeError(failure));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="仕事を依頼"
      submitLabel={busy ? '送信中…' : '依頼する'}
      canSubmit={!busy && Boolean(form.prompt.trim()) && Boolean(agent)}
      error={error}
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <label className="field">
        <span>担当する社員</span>
        <select
          value={form.agentId}
          onChange={(event) => {
            const id = event.currentTarget.value;
            setForm((current) => retargetTaskForm(current, find(id)));
          }}
        >
          {groupAgentsByTeam(snapshot.teams, snapshot.agents)
            .filter((group) => group.agents.length > 0)
            .map(({ team, agents }) => (
              <optgroup key={team.id} label={team.name}>
                {agents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}（{ROLE_LABELS[item.role]}）
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
      </label>
      <label className="field">
        <span>依頼内容</span>
        <textarea
          data-autofocus
          rows={5}
          value={form.prompt}
          placeholder="例: READMEを読んで、改善点を3つ提案してください。"
          onChange={(event) => {
            const prompt = event.currentTarget.value;
            setForm((current) => ({ ...current, prompt }));
          }}
        />
      </label>
      <label className="field">
        <span>件名（省略可）</span>
        <input
          type="text"
          value={form.title}
          maxLength={TITLE_LIMIT * 3}
          placeholder={deriveTaskTitle(form.prompt) || '依頼内容の1行目を使います'}
          onChange={(event) => {
            const title = event.currentTarget.value;
            setForm((current) => ({ ...current, title }));
          }}
        />
      </label>
      <ProviderModelFields
        provider={form.provider}
        model={form.model}
        effort={form.effort}
        onProvider={(provider) =>
          setForm((current) => changeTaskProvider(current, provider, agent))
        }
        onModel={(model) => setForm((current) => ({ ...current, model }))}
        onEffort={(effort) => setForm((current) => ({ ...current, effort }))}
      />
      <WorkspaceField
        value={form.workspacePath}
        placeholder="空欄で社員の作業フォルダ"
        canBrowse={canBrowse}
        onChange={(workspacePath) => setForm((current) => ({ ...current, workspacePath }))}
        onBrowse={() =>
          void onPickDirectory(form.workspacePath).then(
            (picked) => {
              if (picked) setForm((current) => ({ ...current, workspacePath: picked }));
            },
            (failure: unknown) => setError(describeError(failure)),
          )
        }
      />
    </Modal>
  );
}
