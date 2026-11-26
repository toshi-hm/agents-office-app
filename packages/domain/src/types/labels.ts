import type { AgentActivity, AgentRole, ProviderKind } from './agent.ts';
import type { TaskStatus } from './task.ts';

export const PROVIDER_LABELS: Readonly<Record<ProviderKind, string>> = Object.freeze({
  claude: 'Claude Code',
  codex: 'Codex',
  agy: 'Antigravity',
  demo: 'Demo Sim',
});

export const ROLE_LABELS: Readonly<Record<AgentRole, string>> = Object.freeze({
  president: '社長',
  dept_manager: '部長',
  employee: '社員',
});

export const ACTIVITY_LABELS: Readonly<Record<AgentActivity, string>> = Object.freeze({
  idle: '待機中',
  starting: '起動中',
  working: '作業中',
  waiting_approval: '承認待ち',
  error: 'エラー',
  external: '外部稼働中',
});

export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = Object.freeze({
  queued: '待機中',
  running: '実行中',
  waiting_approval: '承認待ち',
  succeeded: '完了',
  failed: '失敗',
  cancelled: '停止済み',
});
