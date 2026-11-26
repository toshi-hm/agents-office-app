import type { ApprovalRequest, Task } from '@agents-office-app/domain';

export type OfficeNotification = Readonly<{
  kind: 'approval' | 'task';
  title: string;
  body: string;
  agentId: string;
  taskId: string;
}>;

export function approvalNotification(
  approval: ApprovalRequest,
  agentName: string,
): OfficeNotification {
  return {
    kind: 'approval',
    title: `${agentName}が承認を待っています`,
    body: `${approval.toolName}: ${approval.summary}`,
    agentId: approval.agentId,
    taskId: approval.taskId,
  };
}

export function taskNotification(task: Task, agentName: string): OfficeNotification {
  const outcome =
    task.status === 'succeeded' ? '完了' : task.status === 'failed' ? '失敗' : '停止';
  return {
    kind: 'task',
    title: `${agentName}の仕事が${outcome}しました`,
    body: task.title,
    agentId: task.agentId,
    taskId: task.id,
  };
}

/** Delivers each keyed notification at most once, even when the stream replays events. */
export function createNotifier(onNotify?: (notification: OfficeNotification) => void) {
  const notified = new Set<string>();
  return (key: string, notification: OfficeNotification) => {
    if (notified.has(key)) return;
    notified.add(key);
    onNotify?.(notification);
  };
}
