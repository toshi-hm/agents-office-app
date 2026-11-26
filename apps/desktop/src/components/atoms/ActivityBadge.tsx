import { ACTIVITY_LABELS } from '@agents-office-app/domain';
import type { AgentActivity } from '@agents-office-app/domain';

export function ActivityBadge({ activity }: { activity: AgentActivity }) {
  return (
    <span className="chip" data-activity={activity}>
      {ACTIVITY_LABELS[activity]}
    </span>
  );
}
