import type { ApprovalDecision, Execution, LogStream, OfficeSseEvent } from '@agents-office-app/domain';
import type { OfficeDb } from '../db/open-db.ts';

export type Child = ReturnType<typeof Bun.spawn<'ignore', 'pipe', 'pipe'>>;
export type Run = {
  execution: Execution;
  abort: AbortController;
  child?: Child;
  done: Promise<void>;
  resolveApproval?: (decision: ApprovalDecision) => void;
};

export type RunContext = {
  db: OfficeDb;
  publish: (event: OfficeSseEvent) => void;
  changed: () => void;
  log: (execution: Execution, stream: LogStream, text: string) => void;
};

export type ExecutionResult = {
  status: 'succeeded' | 'failed' | 'cancelled';
  summary: string | null;
  exitCode: number | null;
};
