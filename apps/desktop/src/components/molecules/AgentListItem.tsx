import { ACTIVITY_LABELS, ROLE_LABELS } from '@agents-office-app/domain';
import type { Agent, AgentActivity } from '@agents-office-app/domain';
import { ActivityDot } from '../atoms/ActivityDot.tsx';
import { Avatar } from '../atoms/Avatar.tsx';
import { ProviderBadge } from '../atoms/ProviderBadge.tsx';

export function AgentListItem({
  agent,
  activity,
  selected,
  onSelect,
}: {
  agent: Agent;
  activity: AgentActivity;
  selected: boolean;
  onSelect: (agentId: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="row agent-row"
        aria-current={selected}
        onClick={() => onSelect(agent.id)}
      >
        <Avatar agent={agent} />
        <span className="row__main">
          <span className="row__title">{agent.displayName}</span>
          <span className="row__meta">
            {ROLE_LABELS[agent.role]}
            <ProviderBadge provider={agent.provider} />
          </span>
        </span>
        <span className="agent-row__state">
          {activity !== 'idle' && <span>{ACTIVITY_LABELS[activity]}</span>}
          <ActivityDot activity={activity} />
        </span>
      </button>
    </li>
  );
}
