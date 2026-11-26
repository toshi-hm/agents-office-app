import { ACTIVITY_LABELS } from '@agents-office-app/domain';
import type { AgentActivity } from '@agents-office-app/domain';

export function ActivityDot({ activity }: { activity: AgentActivity }) {
  return (
    <span
      className="activity-dot"
      data-activity={activity}
      role="img"
      aria-label={ACTIVITY_LABELS[activity]}
      title={ACTIVITY_LABELS[activity]}
    />
  );
}
