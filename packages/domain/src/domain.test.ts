import { describe, expect, test } from 'bun:test';
import {
  SLOT_COUNT,
  acquireSlot,
  countOccupiedSlots,
  createSlotLedger,
  deriveAgentActivities,
  deriveOfficeHealth,
  releaseSlot,
  type Agent,
  type ApprovalRequest,
  type Execution,
  type ExternalSession,
  type Task,
} from './index.ts';

describe('SlotLedger', () => {
  test('acquires up to 4 slots and rejects the 5th', () => {
    let ledger = createSlotLedger();
    expect(countOccupiedSlots(ledger)).toBe(0);

    for (let i = 1; i <= SLOT_COUNT; i += 1) {
      const res = acquireSlot(ledger, {
        executionId: `exec-${i}`,
        agentId: `agent-${i}`,
        taskId: `task-${i}`,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.slotNo).toBe(i);
        ledger = res.ledger;
      }
    }

    expect(countOccupiedSlots(ledger)).toBe(4);
    const fifth = acquireSlot(ledger, {
      executionId: 'exec-5',
      agentId: 'agent-5',
      taskId: 'task-5',
    });
    expect(fifth.ok).toBe(false);
    if (!fifth.ok) {
      expect(fifth.code).toBe('no_free_slot');
    }
  });

  test('rejects busy agent and releases slot cleanly', () => {
    const base = createSlotLedger();
    const first = acquireSlot(base, {
      executionId: 'exec-1',
      agentId: 'agent-1',
      taskId: 'task-1',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const dupAgent = acquireSlot(first.ledger, {
      executionId: 'exec-2',
      agentId: 'agent-1',
      taskId: 'task-2',
    });
    expect(dupAgent.ok).toBe(false);
    if (!dupAgent.ok) {
      expect(dupAgent.code).toBe('agent_busy');
    }

    const freed = releaseSlot(first.ledger, 'exec-1');
    expect(countOccupiedSlots(freed)).toBe(0);
  });
});

describe('deriveAgentActivities & deriveOfficeHealth', () => {
  const agent: Agent = {
    id: 'agent-1',
    displayName: 'Claude 開発担当',
    role: 'employee',
    teamId: 'team-dev',
    teamName: '開発部',
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    effort: 'high',
    workspacePath: '/Users/user/work',
    avatarColor: '#4f7cac',
    statusNote: null,
    createdAt: '2026-11-26T00:00:00.000Z',
    updatedAt: '2026-11-26T00:00:00.000Z',
  };

  test('maps pending approval > active execution > external session > idle', () => {
    const exec: Execution = {
      id: 'exec-1',
      taskId: 'task-1',
      agentId: 'agent-1',
      slotNo: 1,
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      effort: 'high',
      pid: 12345,
      status: 'active',
      workspacePath: '/Users/user/work',
      startedAt: '2026-11-26T00:00:00.000Z',
      finishedAt: null,
      exitCode: null,
      summary: null,
    };

    const approval: ApprovalRequest = {
      id: 'appr-1',
      executionId: 'exec-1',
      taskId: 'task-1',
      agentId: 'agent-1',
      toolName: 'Bash',
      summary: 'Run tests',
      detail: 'bun test',
      status: 'pending',
      decision: null,
      createdAt: '2026-11-26T00:00:05.000Z',
      decidedAt: null,
    };

    const task: Task = {
      id: 'task-1',
      title: 'テスト実行',
      prompt: 'テストを実行して',
      kind: 'task',
      status: 'waiting_approval',
      agentId: 'agent-1',
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      effort: 'high',
      workspacePath: '/Users/user/work',
      createdAt: '2026-11-26T00:00:00.000Z',
      updatedAt: '2026-11-26T00:00:05.000Z',
      completedAt: null,
      resultSummary: null,
      errorMessage: null,
    };

    const external: ExternalSession = {
      pid: 99999,
      provider: 'claude',
      command: 'claude',
      cwd: '/Users/user/work/agents-office',
      observedAt: '2026-11-26T00:00:05.000Z',
    };

    expect(deriveAgentActivities([agent], [exec], [approval], [task], [])['agent-1']).toBe(
      'waiting_approval',
    );
    expect(deriveAgentActivities([agent], [exec], [], [task], [])['agent-1']).toBe('working');
    expect(deriveAgentActivities([agent], [], [], [], [external])['agent-1']).toBe('external');
    expect(deriveAgentActivities([agent], [], [], [], [])['agent-1']).toBe('idle');

    const health = deriveOfficeHealth([task], [exec], [approval], [external]);
    expect(health.slotsUsed).toBe(1);
    expect(health.slotsTotal).toBe(4);
    expect(health.pendingApprovals).toBe(1);
    expect(health.externalSessionsCount).toBe(1);
  });

  test('matches external sessions 1-to-1 when cwd is unknown', () => {
    const secondAgent: Agent = { ...agent, id: 'agent-2', displayName: 'Claude 2号' };
    const unknownCwdSession: ExternalSession = {
      pid: 77777,
      provider: 'claude',
      command: 'claude',
      cwd: null,
      observedAt: '2026-11-26T00:00:05.000Z',
    };

    const activities = deriveAgentActivities([agent, secondAgent], [], [], [], [unknownCwdSession]);
    expect(activities['agent-1']).toBe('external');
    expect(activities['agent-2']).toBe('idle');
  });
});
