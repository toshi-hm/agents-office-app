import type { OfficeSnapshot } from '@agents-office-app/domain';
import type { OfficeSelection } from '../../hooks/useOfficeSelection.ts';
import type { ConnectionState } from '../../lib/api/store-state.ts';
import type { ResolvedTheme, ThemePreference } from '../../lib/theme.ts';
import { getPendingApprovals } from '../../lib/view/summaries.ts';
import type { OfficeActions } from '../actions.ts';
import { AgentInspector } from '../organisms/AgentInspector.tsx';
import { CenterStage } from '../organisms/CenterStage.tsx';
import { Sidebar } from '../organisms/Sidebar.tsx';
import { TitleBar } from '../organisms/TitleBar.tsx';

/** Title bar above the sidebar, the 3D office and the inspector. */
export function FullOfficeLayout(props: {
  snapshot: OfficeSnapshot | null;
  connection: ConnectionState;
  error: string | null;
  theme: ResolvedTheme;
  themePreference: ThemePreference;
  pinned: boolean;
  selection: OfficeSelection;
  actions: OfficeActions;
  onThemeChange: (theme: ThemePreference) => void;
  onTogglePin: () => void;
  onMini: () => void;
  onRetry: () => void;
}) {
  const { snapshot, selection, actions } = props;
  const { selectedId, selected, selectedLogs, tab, setTab } = selection;
  return (
    <>
      <TitleBar
        health={snapshot?.health ?? null}
        pendingApprovals={snapshot ? getPendingApprovals(snapshot.approvals).length : 0}
        ready={snapshot !== null}
        demoBusy={actions.isBusy('demo')}
        pinned={props.pinned}
        theme={props.themePreference}
        onShowApprovals={selection.showNextApproval}
        onDemo={() => actions.runDemo('kickoff')}
        onNewTask={() => actions.openTaskModal()}
        onNewAgent={() => actions.openAgentModal()}
        onTogglePin={props.onTogglePin}
        onMini={props.onMini}
        onThemeChange={props.onThemeChange}
      />
      <div className="workspace">
        <Sidebar
          snapshot={snapshot}
          selectedId={selectedId}
          tab={tab}
          onTabChange={setTab}
          actions={actions}
        />
        <CenterStage
          snapshot={snapshot}
          connection={props.connection}
          error={props.error}
          selectedId={selectedId}
          theme={props.theme}
          onSelect={actions.select}
          onRetry={props.onRetry}
        />
        <AgentInspector
          snapshot={snapshot}
          agent={selected}
          logs={selectedLogs}
          actions={actions}
        />
      </div>
    </>
  );
}
