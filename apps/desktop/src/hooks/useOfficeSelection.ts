import { useEffect, useState } from 'react';
import type { ExecutionLog } from '@agents-office-app/domain';
import type { SidebarTab } from '../components/molecules/SidebarTabs.tsx';
import type { OfficeStore } from '../lib/api/office-store.ts';
import type { OfficeState } from '../lib/api/store-state.ts';
import { getPendingApprovals } from '../lib/view/summaries.ts';

const NO_LOGS: readonly ExecutionLog[] = [];

/** The selected agent, its logs and the sidebar tab. */
export function useOfficeSelection(store: OfficeStore, state: OfficeState) {
  const { snapshot, connection } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<SidebarTab>('agents');

  const selected = snapshot?.agents.find((agent) => agent.id === selectedId) ?? null;
  // Drop a selection that points at an agent which no longer exists.
  useEffect(() => {
    if (selectedId && snapshot && !selected) setSelectedId(null);
  }, [selectedId, snapshot, selected]);

  const live = connection === 'live';
  useEffect(() => {
    if (selectedId) void store.loadAgentLogs(selectedId);
  }, [selectedId, live, store]);

  const showNextApproval = () => {
    const next = snapshot ? getPendingApprovals(snapshot.approvals)[0] : undefined;
    setSelectedId(next?.agentId ?? null);
  };

  return {
    selectedId,
    setSelectedId,
    selected,
    selectedLogs: (selectedId ? state.logs[selectedId] : undefined) ?? NO_LOGS,
    tab,
    setTab,
    showNextApproval,
  };
}

export type OfficeSelection = ReturnType<typeof useOfficeSelection>;
