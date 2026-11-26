import type { OfficeSnapshot } from '@agents-office-app/domain';
import { isTaskActive } from '../../lib/view/task-helpers.ts';
import type { OfficeActions } from '../actions.ts';
import { ExternalSessionList } from '../molecules/ExternalSessionList.tsx';
import { SidebarTabs } from '../molecules/SidebarTabs.tsx';
import type { SidebarTab } from '../molecules/SidebarTabs.tsx';
import { AgentRosterPanel } from './AgentRosterPanel.tsx';
import { TaskListPanel } from './TaskListPanel.tsx';

export function Sidebar({
  snapshot,
  selectedId,
  tab,
  onTabChange,
  actions,
}: {
  snapshot: OfficeSnapshot | null;
  selectedId: string | null;
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  actions: OfficeActions;
}) {
  const activeTasks = snapshot?.tasks.filter((task) => isTaskActive(task.status)).length ?? 0;
  const Panel = tab === 'agents' ? AgentRosterPanel : TaskListPanel;
  return (
    <nav className="sidebar panel" aria-label="社員と仕事">
      <SidebarTabs
        tab={tab}
        agentCount={snapshot?.agents.length ?? 0}
        activeTaskCount={activeTasks}
        onChange={onTabChange}
      />
      <div className="sidebar__scroll" role="tabpanel">
        {!snapshot ? (
          <p className="empty">読み込み中…</p>
        ) : (
          <Panel snapshot={snapshot} selectedId={selectedId} actions={actions} />
        )}
        {snapshot && snapshot.externalSessions.length > 0 && (
          <ExternalSessionList sessions={snapshot.externalSessions} />
        )}
      </div>
    </nav>
  );
}
