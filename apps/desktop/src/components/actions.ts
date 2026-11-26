import type { ApprovalDecision } from '@agents-office-app/domain';
import type { DemoKind } from '../lib/api-client.ts';

/** User intents shared by the full and mini layouts. `isBusy` guards double submission. */
export type OfficeActions = Readonly<{
  select: (agentId: string | null) => void;
  decide: (approvalId: string, decision: ApprovalDecision) => void;
  stopTask: (taskId: string) => void;
  assign: (agentId: string, prompt: string) => Promise<boolean>;
  openTaskModal: (agentId?: string) => void;
  openAgentModal: (agentId?: string) => void;
  deleteAgent: (agentId: string) => void;
  openInFinder: (path: string) => void;
  openInTerminal: (path: string) => void;
  runDemo: (kind: DemoKind) => void;
  isBusy: (key: string) => boolean;
}>;
