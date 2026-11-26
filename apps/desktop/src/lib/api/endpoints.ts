import type {
  Agent,
  ApprovalDecision,
  ApprovalRequest,
  CreateAgentInput,
  CreateTaskInput,
  ExecutionLog,
  OfficeSnapshot,
  Task,
  UpdateAgentInput,
} from '@agents-office-app/domain';
import type { RequestFn } from './transport.ts';

export type DemoKind = 'kickoff' | 'approval' | 'stop_all';

const id = encodeURIComponent;

/** One method per route in docs/architecture/api-contract.md. */
export function createEndpoints(request: RequestFn) {
  const getLogs = async (scope: 'tasks' | 'agents', ownerId: string, limit: number) =>
    (
      await request<{ logs: ExecutionLog[] }>(
        'GET',
        `/api/${scope}/${id(ownerId)}/logs?limit=${limit}`,
      )
    ).logs;

  return {
    getSnapshot: () => request<OfficeSnapshot>('GET', '/api/snapshot'),
    createAgent: async (input: CreateAgentInput) =>
      (await request<{ agent: Agent }>('POST', '/api/agents', input)).agent,
    updateAgent: async (agentId: string, input: UpdateAgentInput) =>
      (await request<{ agent: Agent }>('PATCH', `/api/agents/${id(agentId)}`, input)).agent,
    deleteAgent: async (agentId: string) => {
      await request<{ ok: true }>('DELETE', `/api/agents/${id(agentId)}`);
    },
    createTask: async (input: CreateTaskInput) =>
      (await request<{ task: Task }>('POST', '/api/tasks', input)).task,
    stopTask: async (taskId: string) =>
      (await request<{ task: Task }>('POST', `/api/tasks/${id(taskId)}/stop`)).task,
    getTaskLogs: (taskId: string, limit = 200) => getLogs('tasks', taskId, limit),
    getAgentLogs: (agentId: string, limit = 200) => getLogs('agents', agentId, limit),
    decideApproval: async (approvalId: string, decision: ApprovalDecision) =>
      (
        await request<{ approval: ApprovalRequest }>(
          'POST',
          `/api/approvals/${id(approvalId)}/decide`,
          { decision },
        )
      ).approval,
    runDemo: (kind: DemoKind = 'kickoff') =>
      request<{ ok: true; startedTaskIds: string[] }>('POST', '/api/demo/scenario', { kind }),
  };
}
