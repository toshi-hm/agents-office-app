import { useState } from 'react';
import { Square, TerminalSquare } from 'lucide-react';
import { ACTIVITY_LABELS, PROVIDER_LABELS, ROLE_LABELS } from '@agents-office-app/domain';
import type { OfficeSnapshot } from '@agents-office-app/domain';
import {
  filterTasks,
  formatRelativeTime,
  groupAgentsByTeam,
  isTaskActive,
  shortenPath,
} from '../lib/view-helpers.ts';
import type { TaskFilter } from '../lib/view-helpers.ts';
import type { OfficeActions } from './actions.ts';
import { ActivityDot, Avatar, ProviderBadge, StatusChip } from './badges.tsx';

export type SidebarTab = 'agents' | 'tasks';

const FILTERS: readonly (readonly [TaskFilter, string])[] = [
  ['all', 'すべて'],
  ['active', '進行中'],
  ['finished', '終了'],
];

export function Sidebar({
  snapshot,
  selectedId,
  tab,
  onTabChange,
  actions,
}: {
  snapshot: OfficeSnapshot | null;
  selectedId: string | null;
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  actions: OfficeActions;
}) {
  const activeTasks = snapshot?.tasks.filter((task) => isTaskActive(task.status)).length ?? 0;
  return (
    <nav className="sidebar panel" aria-label="社員と仕事">
      <div className="segmented" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'agents'}
          onClick={() => onTabChange('agents')}
        >
          社員
          <span className="segmented__count">{snapshot?.agents.length ?? 0}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tasks'}
          onClick={() => onTabChange('tasks')}
        >
          仕事
          {activeTasks > 0 && <span className="segmented__count">{activeTasks}</span>}
        </button>
      </div>
      <div className="sidebar__scroll" role="tabpanel">
        {!snapshot ? (
          <p className="empty">読み込み中…</p>
        ) : tab === 'agents' ? (
          <AgentList snapshot={snapshot} selectedId={selectedId} actions={actions} />
        ) : (
          <TaskList snapshot={snapshot} selectedId={selectedId} actions={actions} />
        )}
        {snapshot && snapshot.externalSessions.length > 0 && (
          <ExternalSessions snapshot={snapshot} />
        )}
      </div>
    </nav>
  );
}

type ListProps = {
  snapshot: OfficeSnapshot;
  selectedId: string | null;
  actions: OfficeActions;
};

function AgentList({ snapshot, selectedId, actions }: ListProps) {
  const groups = groupAgentsByTeam(snapshot.teams, snapshot.agents);
  return (
    <>
      {groups.map(({ team, agents }) => (
        <section key={team.id} className="team">
          <h2 className="section-title">
            <span className="team__swatch" style={{ background: team.color }} />
            {team.name}
          </h2>
          {agents.length === 0 ? (
            <p className="empty">社員はいません</p>
          ) : (
            <ul className="list">
              {agents.map((agent) => {
                const activity = snapshot.agentActivities[agent.id] ?? 'idle';
                return (
                  <li key={agent.id}>
                    <button
                      type="button"
                      className="row agent-row"
                      aria-current={selectedId === agent.id}
                      onClick={() => actions.select(agent.id)}
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
              })}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}

function TaskList({ snapshot, selectedId, actions }: ListProps) {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const tasks = filterTasks(snapshot.tasks, filter);
  const names = new Map(snapshot.agents.map((agent) => [agent.id, agent.displayName]));
  return (
    <>
      <div className="filter" role="group" aria-label="仕事の絞り込み">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {tasks.length === 0 ? (
        <p className="empty">該当する仕事はありません</p>
      ) : (
        <ul className="list">
          {tasks.map((task) => (
            <li key={task.id} className="task-item">
              <button
                type="button"
                className="row task-row"
                aria-current={selectedId === task.agentId}
                onClick={() => actions.select(task.agentId)}
              >
                <span className="row__main">
                  <span className="row__title">{task.title}</span>
                  <span className="row__meta">
                    <StatusChip status={task.status} />
                    {names.get(task.agentId) ?? '退職した社員'}・
                    {formatRelativeTime(task.createdAt)}
                  </span>
                </span>
              </button>
              {isTaskActive(task.status) && (
                <button
                  type="button"
                  className="icon-button task-item__stop"
                  aria-label={`「${task.title}」を停止`}
                  title="停止"
                  disabled={actions.isBusy(`stop:${task.id}`)}
                  onClick={() => actions.stopTask(task.id)}
                >
                  <Square size={12} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ExternalSessions({ snapshot }: { snapshot: OfficeSnapshot }) {
  return (
    <section className="team external">
      <h2 className="section-title">
        <TerminalSquare size={13} aria-hidden="true" />
        このMacで動作中のCLI
      </h2>
      <ul className="list">
        {snapshot.externalSessions.map((session) => (
          <li key={session.pid} className="external__item" title={session.command}>
            <span className="row__title">{PROVIDER_LABELS[session.provider]}</span>
            <span className="row__meta">
              PID {session.pid}・{session.cwd ? shortenPath(session.cwd) : '場所は不明'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
