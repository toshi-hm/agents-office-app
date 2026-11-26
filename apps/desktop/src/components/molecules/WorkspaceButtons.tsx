import { FolderOpen, Terminal } from 'lucide-react';
import type { OfficeActions } from '../actions.ts';

/** Opens the agent's working folder in macOS apps. */
export function WorkspaceButtons({ path, actions }: { path: string; actions: OfficeActions }) {
  return (
    <div className="button-row">
      <button
        type="button"
        className="button"
        disabled={!path}
        onClick={() => actions.openInFinder(path)}
      >
        <FolderOpen size={13} aria-hidden="true" />
        Finder
      </button>
      <button
        type="button"
        className="button"
        disabled={!path}
        onClick={() => actions.openInTerminal(path)}
      >
        <Terminal size={13} aria-hidden="true" />
        ターミナル
      </button>
    </div>
  );
}
