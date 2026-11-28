import type { ApprovalRequest, ExecutionLog } from './execution.ts';
import type { OfficeSnapshot } from './snapshot.ts';
import type { Task } from './task.ts';

export type OfficeSseEvent =
  | Readonly<{ type: 'snapshot'; snapshot: OfficeSnapshot }>
  | Readonly<{ type: 'log'; log: ExecutionLog }>
  | Readonly<{ type: 'approval_requested'; approval: ApprovalRequest }>
  | Readonly<{ type: 'approval_decided'; approval: ApprovalRequest }>
  | Readonly<{ type: 'task_finished'; task: Task }>
  | Readonly<{ type: 'heartbeat'; timestamp: string }>;
