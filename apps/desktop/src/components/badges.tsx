import { ACTIVITY_LABELS, PROVIDER_LABELS, TASK_STATUS_LABELS } from '@agents-office-app/domain';
import type { Agent, AgentActivity, ProviderKind, TaskStatus } from '@agents-office-app/domain';
import { PROVIDER_COLORS } from '@agents-office-app/office-scene';
import { PROVIDER_SHORT } from '../lib/view-helpers.ts';

export function ProviderBadge({ provider }: { provider: ProviderKind }) {
  return (
    <span className="provider-badge" title={PROVIDER_LABELS[provider]}>
      <span className="provider-badge__dot" style={{ background: PROVIDER_COLORS[provider] }} />
      {PROVIDER_SHORT[provider]}
    </span>
  );
}

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

export function ActivityChip({ activity }: { activity: AgentActivity }) {
  return (
    <span className="chip" data-activity={activity}>
      {ACTIVITY_LABELS[activity]}
    </span>
  );
}

export function StatusChip({ status }: { status: TaskStatus }) {
  return (
    <span className="chip" data-status={status}>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

export function Avatar({ agent, size = 'md' }: { agent: Agent; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ background: agent.avatarColor }}
      aria-hidden="true"
    >
      {[...agent.displayName][0] ?? '?'}
    </span>
  );
}
