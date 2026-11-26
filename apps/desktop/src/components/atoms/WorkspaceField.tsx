import { FolderSearch } from 'lucide-react';

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
