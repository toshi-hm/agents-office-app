import { FolderSearch } from 'lucide-react';
import { PROVIDER_LABELS } from '@agents-office-app/domain';
import type { ProviderKind, ReasoningEffort } from '@agents-office-app/domain';
import { EFFORTS, EFFORT_LABELS, PROVIDERS } from '../lib/view-helpers.ts';

export function ProviderModelFields({
  provider,
  model,
  effort,
  onProvider,
  onModel,
  onEffort,
}: {
  provider: ProviderKind;
  model: string;
  effort: ReasoningEffort;
  onProvider: (value: ProviderKind) => void;
  onModel: (value: string) => void;
  onEffort: (value: ReasoningEffort) => void;
}) {
  return (
    <div className="field-grid">
      <label className="field">
        <span>プロバイダ</span>
        <select
          value={provider}
          onChange={(event) => onProvider(event.currentTarget.value as ProviderKind)}
        >
          {PROVIDERS.map((value) => (
            <option key={value} value={value}>
              {PROVIDER_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>モデル</span>
        <input
          type="text"
          value={model}
          placeholder="空欄で既定"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => onModel(event.currentTarget.value)}
        />
      </label>
      <label className="field">
        <span>思考の深さ</span>
        <select
          value={effort}
          onChange={(event) => onEffort(event.currentTarget.value as ReasoningEffort)}
        >
          {EFFORTS.map((value) => (
            <option key={value} value={value}>
              {EFFORT_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function WorkspaceField({
  value,
  placeholder,
  canBrowse,
  onChange,
  onBrowse,
}: {
  value: string;
  placeholder: string;
  canBrowse: boolean;
  onChange: (value: string) => void;
  onBrowse: () => void;
}) {
  return (
    <div className="field">
      <label htmlFor="workspace-path">作業フォルダ</label>
      <div className="field__with-button">
        <input
          id="workspace-path"
          type="text"
          value={value}
          placeholder={placeholder}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <button
          type="button"
          className="button"
          disabled={!canBrowse}
          title={canBrowse ? 'フォルダを選ぶ' : 'フォルダ選択はデスクトップアプリで利用できます'}
          onClick={onBrowse}
        >
          <FolderSearch size={14} aria-hidden="true" />
          選択…
        </button>
      </div>
    </div>
  );
}
