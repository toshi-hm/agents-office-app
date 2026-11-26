import { X } from 'lucide-react';
import { ROLE_LABELS } from '@agents-office-app/domain';
import type { Agent, AgentActivity } from '@agents-office-app/domain';
import { ActivityBadge } from '../atoms/ActivityBadge.tsx';
import { Avatar } from '../atoms/Avatar.tsx';
import { IconButton } from '../atoms/IconButton.tsx';

export function AgentInspectorHeader({
  agent,
  activity,
  onClose,
}: {
  agent: Agent;
  activity: AgentActivity;
  onClose: () => void;
}) {
  return (
    <>
      <header className="profile">
        <Avatar agent={agent} size="lg" />
        <div className="profile__text">
          <h2>{agent.displayName}</h2>
          <p>
            {ROLE_LABELS[agent.role]}・{agent.teamName}
          </p>
          <ActivityBadge activity={activity} />
        </div>
        <IconButton aria-label="選択を解除" title="選択を解除 (esc)" onClick={onClose}>
          <X size={15} aria-hidden="true" />
        </IconButton>
      </header>
      {agent.statusNote && <p className="profile__note">{agent.statusNote}</p>}
    </>
  );
}
