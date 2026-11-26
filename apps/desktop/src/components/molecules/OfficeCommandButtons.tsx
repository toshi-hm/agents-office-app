import { Play, Plus, UserPlus } from 'lucide-react';

/** The title bar's ways to put the office to work. */
export function OfficeCommandButtons({
  ready,
  demoBusy,
  onDemo,
  onNewTask,
  onNewAgent,
}: {
  ready: boolean;
  demoBusy: boolean;
  onDemo: () => void;
  onNewTask: () => void;
  onNewAgent: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="button button--quiet"
        disabled={!ready || demoBusy}
        onClick={onDemo}
        title="デモ社員に仕事を割り当てて、オフィスの動きを確認します"
      >
        <Play size={14} aria-hidden="true" />
        <span className="titlebar__label">デモ実行</span>
      </button>
      <button
        type="button"
        className="button button--primary"
        disabled={!ready}
        onClick={onNewTask}
        title="仕事を依頼 (⌘N)"
      >
        <Plus size={15} aria-hidden="true" />
        <span>仕事を依頼</span>
        <kbd className="titlebar__label">⌘N</kbd>
      </button>
      <button
        type="button"
        className="button button--quiet"
        disabled={!ready}
        onClick={onNewAgent}
        title="社員を追加"
      >
        <UserPlus size={14} aria-hidden="true" />
        <span className="titlebar__label">社員追加</span>
      </button>
    </>
  );
}
