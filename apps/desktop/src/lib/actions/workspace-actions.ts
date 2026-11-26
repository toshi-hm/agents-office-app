import type { OfficeActions } from '../../components/actions.ts';
import type { ActionContext } from './context.ts';

export function createWorkspaceActions({
  bridge,
  run,
  push,
}: ActionContext): Pick<OfficeActions, 'openInFinder' | 'openInTerminal'> {
  const openPath = (key: 'finder' | 'terminal', path: string) => {
    void run(`open:${key}`, async () => {
      const opened =
        key === 'finder'
          ? await bridge.openPathInFinder(path)
          : await bridge.openPathInTerminal(path);
      if (!opened) {
        push({ tone: 'info', title: 'ブラウザプレビューでは開けません', body: path });
      }
    });
  };
  return {
    openInFinder: (path) => openPath('finder', path),
    openInTerminal: (path) => openPath('terminal', path),
  };
}
