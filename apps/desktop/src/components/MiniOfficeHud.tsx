import { useState } from 'react';
import { Check, GripHorizontal, Maximize2, Pin, PinOff, ShieldAlert, Tags, X } from 'lucide-react';
import { OfficeViewport } from '@agents-office-app/office-scene';
import type { LabelMode } from '@agents-office-app/office-scene';
import { ROLE_LABELS } from '@agents-office-app/domain';
import type { Agent, OfficeSnapshot } from '@agents-office-app/domain';
import type { ConnectionState } from '../lib/api-client.ts';
import type { ResolvedTheme } from '../lib/theme.ts';
import {
  countByActivity,
  getCurrentTask,
  getPendingApprovals,
  isTaskActive,
} from '../lib/view-helpers.ts';
import type { OfficeActions } from './actions.ts';
import { ActivityChip, Avatar } from './badges.tsx';
import { CONNECTION_LABELS, ConnectionCard } from './CenterStage.tsx';

export function MiniOfficeHud({
  snapshot,
  connection,
  error,
  selectedId,
  theme,
  native,
  pinned,
  actions,
  onTogglePin,
  onExpand,
  onRetry,
}: {
  snapshot: OfficeSnapshot | null;
  connection: ConnectionState;
  error: string | null;
  selectedId: string | null;
  theme: ResolvedTheme;
  /** Native windows keep the traffic lights, so the bar starts to their right. */
  native: boolean;
  pinned: boolean;
  actions: OfficeActions;
  onTogglePin: () => void;
  onExpand: () => void;
  onRetry: () => void;
}) {
  const [labelMode, setLabelMode] = useState<LabelMode>('focus');
  const counts = snapshot ? countByActivity(snapshot) : null;
  const approvals = snapshot ? getPendingApprovals(snapshot.approvals) : [];
  const selected = snapshot?.agents.find((agent) => agent.id === selectedId) ?? null;
  // Agents this office is running; external CLI sessions are not counted.
  const active = counts ? counts.working + counts.waiting : 0;
  const PinIcon = pinned ? Pin : PinOff;
  const nextApproval = approvals[0];

  return (
    <div className="mini" data-native={native}>
      <div className="mini__stage">
        {snapshot ? (
          <OfficeViewport
            compact
            members={snapshot.agents}
            teams={snapshot.teams}
            activities={snapshot.agentActivities}
            selectedId={selectedId}
            onSelect={actions.select}
            theme={theme}
            labelMode={labelMode}
          />
        ) : (
          <ConnectionCard connection={connection} error={error} onRetry={onRetry} />
        )}
      </div>

      {/* The whole strip drags the window; only the pill's buttons take clicks. */}
      <div className="mini__dragstrip" data-tauri-drag-region />
      <div className="mini__bar" data-tauri-drag-region>
        <GripHorizontal size={14} className="mini__grip" data-tauri-drag-region />
        <span className="mini__count" data-tauri-drag-region data-connection={connection}>
          {connection === 'live' ? `稼働 ${active}` : CONNECTION_LABELS[connection]}
        </span>
        {nextApproval && (
          <button
            type="button"
            className="mini__alert"
            title="承認を待っている社員を表示"
            onClick={() => actions.select(nextApproval.agentId)}
          >
            <ShieldAlert size={13} aria-hidden="true" />
            承認 {approvals.length}
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          aria-pressed={labelMode === 'all'}
          aria-label="名札をすべて表示"
          title="名札をすべて表示"
          onClick={() => setLabelMode(labelMode === 'all' ? 'focus' : 'all')}
        >
          <Tags size={13} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-pressed={pinned}
          aria-label="常に手前に表示"
          title={pinned ? '常に手前に表示: オン' : '常に手前に表示: オフ'}
          onClick={onTogglePin}
        >
          <PinIcon size={13} aria-hidden="true" />
        </button>
        <button type="button" className="mini__expand" title="拡大 (⌘M)" onClick={onExpand}>
          <Maximize2 size={12} aria-hidden="true" />
          拡大
        </button>
      </div>

      {snapshot && selected && (
        <MiniPopover snapshot={snapshot} agent={selected} actions={actions} onExpand={onExpand} />
      )}
    </div>
  );
}

function MiniPopover({
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
        <ActivityChip activity={activity} />
        <button
          type="button"
          className="icon-button"
          aria-label="閉じる"
          onClick={() => actions.select(null)}
        >
          <X size={13} aria-hidden="true" />
        </button>
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
      <div className="mini-popover__actions">
        <button type="button" className="link" onClick={onExpand}>
          詳細を開く
        </button>
        {activeTask && (
          <button
            type="button"
            className="button button--danger-quiet"
            disabled={actions.isBusy(`stop:${activeTask.id}`)}
            onClick={() => actions.stopTask(activeTask.id)}
          >
            停止
          </button>
        )}
        {approval && (
          <>
            <button
              type="button"
              className="button button--deny"
              disabled={actions.isBusy(`approval:${approval.id}`)}
              onClick={() => actions.decide(approval.id, 'deny')}
            >
              却下
            </button>
            <button
              type="button"
              className="button button--allow"
              disabled={actions.isBusy(`approval:${approval.id}`)}
              onClick={() => actions.decide(approval.id, 'allow')}
            >
              <Check size={13} aria-hidden="true" />
              許可
            </button>
          </>
        )}
      </div>
    </div>
  );
}
