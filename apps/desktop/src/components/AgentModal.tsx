import { useState } from 'react';
import { ROLE_LABELS } from '@agents-office-app/domain';
import type { Agent, AgentRole, Team } from '@agents-office-app/domain';
import { describeError } from '../lib/tauri-bridge.ts';
import {
  AVATAR_COLORS,
  ROLES,
  createAgentForm,
  validateAgentForm,
} from '../lib/view-helpers.ts';
import type { AgentForm } from '../lib/view-helpers.ts';
import { ProviderModelFields, WorkspaceField } from './fields.tsx';
import { Modal } from './Modal.tsx';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patch = (next: Partial<AgentForm>) => setForm((current) => ({ ...current, ...next }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (failure) {
      setError(describeError(failure));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={agent ? '社員を編集' : '社員を追加'}
      submitLabel={busy ? '保存中…' : agent ? '保存する' : '追加する'}
      canSubmit={!busy && validateAgentForm(form) === null}
      error={error}
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <label className="field">
        <span>名前</span>
        <input
          data-autofocus
          type="text"
          value={form.displayName}
          maxLength={40}
          placeholder="例: 佐藤 みどり"
          onChange={(event) => patch({ displayName: event.currentTarget.value })}
        />
      </label>
      <div className="field-grid field-grid--two">
        <label className="field">
          <span>役職</span>
          <select
            value={form.role}
            onChange={(event) => patch({ role: event.currentTarget.value as AgentRole })}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>チーム</span>
          <select
            value={form.teamId}
            onChange={(event) => patch({ teamId: event.currentTarget.value })}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ProviderModelFields
        provider={form.provider}
        model={form.model}
        effort={form.effort}
        onProvider={(provider) =>
          // A model name belongs to one provider.
          patch({ provider, model: agent?.provider === provider ? agent.model : '' })
        }
        onModel={(model) => patch({ model })}
        onEffort={(effort) => patch({ effort })}
      />
      <WorkspaceField
        value={form.workspacePath}
        placeholder={agent ? '空欄なら変更しません' : '空欄で既定のフォルダ'}
        canBrowse={canBrowse}
        onChange={(workspacePath) => patch({ workspacePath })}
        onBrowse={() =>
          void onPickDirectory(form.workspacePath).then(
            (picked) => {
              if (picked) patch({ workspacePath: picked });
            },
            (failure: unknown) => setError(describeError(failure)),
          )
        }
      />
      <fieldset className="field swatches">
        <legend>テーマカラー</legend>
        {AVATAR_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className="swatch"
            style={{ background: color }}
            aria-label={`色 ${color}`}
            aria-pressed={form.avatarColor.toLowerCase() === color}
            onClick={() => patch({ avatarColor: color })}
          />
        ))}
        <input
          type="color"
          aria-label="好きな色を選ぶ"
          value={form.avatarColor}
          onChange={(event) => patch({ avatarColor: event.currentTarget.value })}
        />
      </fieldset>
    </Modal>
  );
}
