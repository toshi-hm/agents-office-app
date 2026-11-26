import { useEffect } from 'react';
import type { OfficeSnapshot } from '@agents-office-app/domain';
import type { TauriBridge } from '../lib/tauri/types.ts';
import { getTraySummary } from '../lib/view/summaries.ts';

/** Mirrors running and pending counts to the menu bar item. */
export function useTraySync(bridge: TauriBridge, snapshot: OfficeSnapshot | null): void {
  const summary = snapshot ? getTraySummary(snapshot) : null;
  const runningCount = summary?.runningCount;
  const pendingCount = summary?.pendingApprovals;
  useEffect(() => {
    if (runningCount === undefined || pendingCount === undefined) return;
    bridge
      .updateTraySummary(runningCount, pendingCount)
      .catch((error: unknown) => console.error('[tray]', error));
  }, [bridge, runningCount, pendingCount]);
}
