export type SidebarTab = 'agents' | 'tasks';

export function SidebarTabs({
  tab,
  agentCount,
  activeTaskCount,
  onChange,
}: {
  tab: SidebarTab;
  agentCount: number;
  activeTaskCount: number;
  onChange: (tab: SidebarTab) => void;
}) {
  return (
    <div className="segmented" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'agents'}
        onClick={() => onChange('agents')}
      >
        社員
        <span className="segmented__count">{agentCount}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'tasks'}
        onClick={() => onChange('tasks')}
      >
        仕事
        {activeTaskCount > 0 && <span className="segmented__count">{activeTaskCount}</span>}
      </button>
    </div>
  );
}
