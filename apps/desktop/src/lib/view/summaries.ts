import type { ApprovalRequest, OfficeHealth, OfficeSnapshot } from '@agents-office-app/domain';

export function getPendingApprovals(
  approvals: readonly ApprovalRequest[],
  agentId?: string,
): readonly ApprovalRequest[] {
  return approvals
    .filter(
      (approval) =>
        approval.status === 'pending' && (agentId === undefined || approval.agentId === agentId),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function countByActivity(snapshot: OfficeSnapshot) {
  const counts = { working: 0, waiting: 0, external: 0, error: 0 };
  for (const agent of snapshot.agents) {
    const activity = snapshot.agentActivities[agent.id];
    if (activity === 'working' || activity === 'starting') counts.working += 1;
    else if (activity === 'waiting_approval') counts.waiting += 1;
    else if (activity === 'external') counts.external += 1;
    else if (activity === 'error') counts.error += 1;
  }
  return counts;
}

export function formatSlotMeter(health: OfficeHealth | null | undefined): string {
  return health ? `${health.slotsUsed} / ${health.slotsTotal} 枠` : '– / 4 枠';
}

export function getTraySummary(snapshot: OfficeSnapshot) {
  return {
    runningCount: snapshot.health.runningExecutions,
    pendingApprovals: getPendingApprovals(snapshot.approvals).length,
  };
}
