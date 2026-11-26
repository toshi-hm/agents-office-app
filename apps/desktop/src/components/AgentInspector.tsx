import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  FolderOpen,
  Pencil,
  Play,
  Send,
  ShieldAlert,
  Square,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { PROVIDER_LABELS, ROLE_LABELS } from '@agents-office-app/domain';
import type { Agent, ExecutionLog, OfficeSnapshot } from '@agents-office-app/domain';
import { isSubmitKey } from '../lib/shortcuts.ts';
import {
  EFFORT_LABELS,
  countByActivity,
  getCurrentTask,
  getPendingApprovals,
  getTaskLogs,
  isTaskActive,
  shortenPath,
} from '../lib/view-helpers.ts';
import type { OfficeActions } from './actions.ts';
import { ApprovalCard } from './ApprovalCard.tsx';
import { ActivityChip, Avatar, ProviderBadge, StatusChip } from './badges.tsx';
import { ConfirmButton } from './ConfirmButton.tsx';
import { LogView } from './LogView.tsx';

export function AgentInspector({
  snapshot,
  agent,
  logs,
  actions,
}: {
  snapshot: OfficeSnapshot | null;
  agent: Agent | null;
  logs: readonly ExecutionLog[];
  actions: OfficeActions;
}) {
  return (
    <aside className="inspector panel" aria-label={agent ? '社員の詳細' : 'オフィスの概要'}>
      {!snapshot ? (
        <p className="empty">読み込み中…</p>
      ) : agent ? (
        // Keyed so drafts and confirmations never carry over to another agent.
        <AgentDetail
          key={agent.id}
          snapshot={snapshot}
          agent={agent}
          logs={logs}
          actions={actions}
        />
      ) : (
        <OfficeSummary snapshot={snapshot} actions={actions} />
      )}
    </aside>
  );
}

function AgentDetail({
  snapshot,
  agent,
  logs,
  actions,
}: {
  snapshot: OfficeSnapshot;
  agent: Agent;
  logs: readonly ExecutionLog[];
  actions: OfficeActions;
}) {
  const activity = snapshot.agentActivities[agent.id] ?? 'idle';
  const approvals = getPendingApprovals(snapshot.approvals, agent.id);
  const task = getCurrentTask(snapshot.tasks, agent.id);
  const queued = snapshot.tasks.filter((t) => t.agentId === agent.id && t.status === 'queued');

  return (
    <div className="inspector__scroll">
      <header className="profile">
        <Avatar agent={agent} size="lg" />
        <div className="profile__text">
          <h2>{agent.displayName}</h2>
          <p>
            {ROLE_LABELS[agent.role]}・{agent.teamName}
          </p>
          <ActivityChip activity={activity} />
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="選択を解除"
          title="選択を解除 (esc)"
          onClick={() => actions.select(null)}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </header>
      {agent.statusNote && <p className="profile__note">{agent.statusNote}</p>}

      {approvals.map((approval) => (
        <ApprovalCard key={approval.id} approval={approval} actions={actions} />
      ))}

      <QuickAssign agent={agent} actions={actions} />

      <section className="card">
        <h3 className="section-title">
          {task && isTaskActive(task.status) ? '進行中の仕事' : '直近の仕事'}
        </h3>
        {task ? (
          <>
            <div className="current-task">
              <div>
                <p className="current-task__title">{task.title}</p>
                <p className="row__meta">
                  <StatusChip status={task.status} />
                  <ProviderBadge provider={task.provider} />
                  {queued.length > 0 && task.status !== 'queued' && `ほか順番待ち ${queued.length}`}
                </p>
              </div>
              {isTaskActive(task.status) && (
                <button
                  type="button"
                  className="button button--danger-quiet"
                  disabled={actions.isBusy(`stop:${task.id}`)}
                  onClick={() => actions.stopTask(task.id)}
                >
                  <Square size={12} aria-hidden="true" />
                  停止
                </button>
              )}
            </div>
            {task.errorMessage && <p className="notice notice--error">{task.errorMessage}</p>}
            {task.resultSummary && <p className="notice">{task.resultSummary}</p>}
            <LogView key={task.id} logs={getTaskLogs(logs, task.id)} />
          </>
        ) : (
          <p className="empty">まだ仕事はありません</p>
        )}
      </section>

      <section className="card">
        <h3 className="section-title">設定</h3>
        <dl className="facts">
          <dt>プロバイダ</dt>
          <dd>{PROVIDER_LABELS[agent.provider]}</dd>
          <dt>モデル</dt>
          <dd>{agent.model || '既定'}</dd>
          <dt>思考の深さ</dt>
          <dd>{EFFORT_LABELS[agent.effort]}</dd>
          <dt>作業フォルダ</dt>
          <dd className="facts__path" title={agent.workspacePath}>
            {agent.workspacePath ? shortenPath(agent.workspacePath) : '未設定'}
          </dd>
        </dl>
        <div className="button-row">
          <button
            type="button"
            className="button"
            disabled={!agent.workspacePath}
            onClick={() => actions.openInFinder(agent.workspacePath)}
          >
            <FolderOpen size={13} aria-hidden="true" />
            Finder
          </button>
          <button
            type="button"
            className="button"
            disabled={!agent.workspacePath}
            onClick={() => actions.openInTerminal(agent.workspacePath)}
          >
            <Terminal size={13} aria-hidden="true" />
            ターミナル
          </button>
        </div>
        <div className="button-row button-row--end">
          <button type="button" className="button" onClick={() => actions.openAgentModal(agent.id)}>
            <Pencil size={13} aria-hidden="true" />
            編集
          </button>
          <ConfirmButton
            confirmLabel="本当に削除する"
            disabled={actions.isBusy(`delete:${agent.id}`)}
            onConfirm={() => actions.deleteAgent(agent.id)}
          >
            <Trash2 size={13} aria-hidden="true" />
            削除
          </ConfirmButton>
        </div>
      </section>
    </div>
  );
}

function QuickAssign({ agent, actions }: { agent: Agent; actions: OfficeActions }) {
  const [prompt, setPrompt] = useState('');
  const busy = actions.isBusy(`assign:${agent.id}`);
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!prompt.trim() || busy) return;
    if (await actions.assign(agent.id, prompt)) setPrompt('');
  };
  return (
    <form className="card quick-assign" onSubmit={(event) => void submit(event)}>
      <h3 className="section-title">かんたん依頼</h3>
      <textarea
        value={prompt}
        rows={3}
        placeholder={`${agent.displayName}にお願いしたいこと…`}
        aria-label={`${agent.displayName}への依頼内容`}
        onChange={(event) => setPrompt(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (!isSubmitKey(event.nativeEvent)) return;
          event.preventDefault();
          void submit();
        }}
      />
      <div className="button-row button-row--between">
        <button type="button" className="link" onClick={() => actions.openTaskModal(agent.id)}>
          詳しく指定する
        </button>
        <button type="submit" className="button button--primary" disabled={!prompt.trim() || busy}>
          <Send size={13} aria-hidden="true" />
          依頼する
          <kbd>⌘↵</kbd>
        </button>
      </div>
    </form>
  );
}

function OfficeSummary({ snapshot, actions }: { snapshot: OfficeSnapshot; actions: OfficeActions }) {
  const counts = countByActivity(snapshot);
  const approvals = getPendingApprovals(snapshot.approvals);
  const names = new Map(snapshot.agents.map((agent) => [agent.id, agent.displayName]));
  const demoBusy = actions.isBusy('demo');
  return (
    <div className="inspector__scroll">
      <header className="summary">
        <h2>オフィスの様子</h2>
        <p>社員を選ぶと、仕事の依頼やログの確認ができます。</p>
        {snapshot.health.operatingState === 'degraded' && (
          <p className="notice notice--error">バックエンドが縮退運転中です。</p>
        )}
      </header>
      <dl className="stats">
        <div>
          <dt>作業中</dt>
          <dd>{counts.working}</dd>
        </div>
        <div>
          <dt>順番待ち</dt>
          <dd>{snapshot.health.queuedTasks}</dd>
        </div>
        <div data-alert={approvals.length > 0}>
          <dt>承認待ち</dt>
          <dd>{approvals.length}</dd>
        </div>
        <div>
          <dt>外部CLI</dt>
          <dd>{snapshot.health.externalSessionsCount}</dd>
        </div>
      </dl>

      <section>
        <h3 className="section-title">
          <ShieldAlert size={13} aria-hidden="true" />
          承認の順番待ち
        </h3>
        {approvals.length === 0 ? (
          <p className="empty">承認待ちはありません</p>
        ) : (
          approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              agentName={names.get(approval.agentId) ?? '社員'}
              actions={actions}
            />
          ))
        )}
      </section>

      <section className="card demo-card">
        <h3 className="section-title">デモで試す</h3>
        <p>実際のCLIを使わずに、社員が席に着いて働く様子を確認できます。</p>
        <div className="button-row">
          <button
            type="button"
            className="button button--primary"
            disabled={demoBusy}
            onClick={() => actions.runDemo('kickoff')}
          >
            <Play size={13} aria-hidden="true" />
            業務を始める
          </button>
          <button
            type="button"
            className="button"
            disabled={demoBusy}
            onClick={() => actions.runDemo('approval')}
          >
            承認を試す
          </button>
        </div>
        <ConfirmButton
          className="link link--danger"
          confirmLabel="実行中の仕事をすべて停止する"
          disabled={demoBusy}
          onConfirm={() => actions.runDemo('stop_all')}
        >
          すべての仕事を停止…
        </ConfirmButton>
      </section>
    </div>
  );
}
