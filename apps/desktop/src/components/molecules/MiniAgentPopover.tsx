import { X } from 'lucide-react';
import { ROLE_LABELS } from '@agents-office-app/domain';
import type { Agent, OfficeSnapshot } from '@agents-office-app/domain';
import { getPendingApprovals } from '../../lib/view/summaries.ts';
import { getCurrentTask, isTaskActive } from '../../lib/view/task-helpers.ts';
import type { OfficeActions } from '../actions.ts';
import { ActivityBadge } from '../atoms/ActivityBadge.tsx';
import { Avatar } from '../atoms/Avatar.tsx';
import { IconButton } from '../atoms/IconButton.tsx';
import { MiniPopoverActions } from './MiniPopoverActions.tsx';

export function MiniAgentPopover({
  snapshot,
  agent,
  actions,
  onExpand,
}: {
  snapshot: OfficeSnapshot;
  agent: Agent;
  actions: OfficeActions;
  onExpand: () => void;
}) {
  const activity = snapshot.agentActivities[agent.id] ?? 'idle';
  const pending = getPendingApprovals(snapshot.approvals, agent.id);
  const approval = pending[0];
  const task = getCurrentTask(snapshot.tasks, agent.id);
  const activeTask = task && isTaskActive(task.status) ? task : null;
  return (
    <div className="mini-popover" role="dialog" aria-label={`${agent.displayName}の状況`}>
      <header>
        <Avatar agent={agent} size="sm" />
        <strong>{agent.displayName}</strong>
        <span className="mini-popover__role">{ROLE_LABELS[agent.role]}</span>
        <ActivityBadge activity={activity} />
        <IconButton aria-label="閉じる" onClick={() => actions.select(null)}>
          <X size={13} aria-hidden="true" />
        </IconButton>
      </header>
      {approval ? (
        <p className="mini-popover__text" title={approval.detail}>
          <b>{approval.toolName}</b> {approval.summary}
          {pending.length > 1 && `（ほか${pending.length - 1}件）`}
        </p>
      ) : (
        <p className="mini-popover__text">
          {activeTask ? activeTask.title : '進行中の仕事はありません'}
        </p>
      )}
      <MiniPopoverActions
        approval={approval}
        activeTask={activeTask}
        actions={actions}
        onExpand={onExpand}
      />
    </div>
  );
}
