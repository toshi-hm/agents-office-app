import type { ExecutionLog, OfficeSnapshot, OfficeSseEvent } from '@agents-office-app/domain';
import { approvalNotification, taskNotification } from './notifications.ts';
import type { OfficeNotification } from './notifications.ts';
import { upsert } from './store-state.ts';

export type EventContext = Readonly<{
  getSnapshot: () => OfficeSnapshot | null;
  setSnapshot: (snapshot: OfficeSnapshot) => void;
  applySnapshot: (snapshot: OfficeSnapshot) => void;
  queueLog: (log: ExecutionLog) => void;
  notifyOnce: (key: string, notification: OfficeNotification) => void;
  scheduleRefresh: () => void;
}>;

/** Folds one stream event into the office state. */
export function applyEvent(event: OfficeSseEvent, context: EventContext): void {
  const snapshot = context.getSnapshot();
  const agentName = (agentId: string) =>
    context.getSnapshot()?.agents.find((agent) => agent.id === agentId)?.displayName ?? '社員';
  switch (event.type) {
    case 'snapshot':
      context.applySnapshot(event.snapshot);
      break;
    case 'log':
      context.queueLog(event.log);
      break;
    case 'approval_requested':
    case 'approval_decided': {
      const { approval } = event;
      // Reflect the decision immediately; the follow-up snapshot settles derived counts.
      if (snapshot) {
        context.setSnapshot({ ...snapshot, approvals: upsert(snapshot.approvals, approval) });
      }
      if (event.type === 'approval_requested' && approval.status === 'pending') {
        context.notifyOnce(
          `approval:${approval.id}`,
          approvalNotification(approval, agentName(approval.agentId)),
        );
      }
      context.scheduleRefresh();
      break;
    }
    case 'task_finished': {
      const { task } = event;
      if (snapshot) context.setSnapshot({ ...snapshot, tasks: upsert(snapshot.tasks, task) });
      context.notifyOnce(
        `task:${task.id}:${task.completedAt ?? task.updatedAt}`,
        taskNotification(task, agentName(task.agentId)),
      );
      context.scheduleRefresh();
      break;
    }
    case 'heartbeat':
      break;
  }
}
