import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultWorkspace, openOfficeDb } from './db.ts';

test('seeds the office once and enables SQLite pragmas', () => {
  const directory = mkdtempSync(join(tmpdir(), 'agents-office-db-'));
  const path = join(directory, 'office.sqlite');
  try {
    const db = openOfficeDb(path);
    try {
      expect(db.sql.query('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' });
      expect(db.sql.query('PRAGMA busy_timeout').get()).toEqual({ timeout: 5000 });
      expect(db.sql.query('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
      const snapshot = db.snapshot();
      expect(snapshot.teams.map(({ name }) => name)).toEqual(['経営', '開発部', 'note部', 'YouTube部']);
      expect(new Set(snapshot.agents.map(({ provider }) => provider))).toEqual(new Set(['claude', 'codex', 'agy', 'demo']));
      expect(snapshot.agents.every(({ workspacePath }) => workspacePath === defaultWorkspace)).toBe(true);
      db.deleteAgent('agent-demo');
    } finally {
      db.close();
    }
    const reopened = openOfficeDb(path);
    try {
      expect(reopened.snapshot().agents).toHaveLength(6);
      expect(() => reopened.requireAgent('agent-demo')).toThrow('Agent not found');
    } finally {
      reopened.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('preserves task configuration and history and recovers interrupted executions', () => {
  const db = openOfficeDb();
  try {
    const agent = db.createAgent({
      teamId: 'team-dev', displayName: 'Engineer', role: 'employee', provider: 'claude', model: 'sonnet',
    });
    const task = db.createTask({ agentId: agent.id, title: 'Change', prompt: 'Update docs', kind: 'proposal' });
    expect(db.updateAgent(agent.id, { teamId: 'team-note', model: '', statusNote: 'Working' })).toMatchObject({
      teamName: 'note部', model: '', statusNote: 'Working',
    });
    expect(db.requireTask(task.id).model).toBe('sonnet');
    expect(() => db.deleteAgent(agent.id)).toThrow('Agent has unfinished tasks');

    const execution = db.beginExecution('interrupted', task, 1);
    const first = db.appendLog(execution, 'stdout', 'first');
    const last = db.appendLog(execution, 'stderr', 'last');
    const approval = db.requestApproval(execution);
    expect(db.snapshot().agentActivities[agent.id]).toBe('waiting_approval');
    expect(db.listLogs('task', task.id)).toEqual([first, last]);
    expect(db.listLogs('agent', agent.id, 1)).toEqual([last]);
    const queued = db.createTask({ agentId: agent.id, title: 'Next', prompt: 'Check docs' });
    db.recover();
    const snapshot = db.snapshot();
    expect(snapshot.health).toMatchObject({ slotsUsed: 0, pendingApprovals: 0, queuedTasks: 1 });
    expect(snapshot.executions[0]).toMatchObject({ status: 'failed', summary: 'server_restarted' });
    expect(snapshot.approvals[0]).toMatchObject({ id: approval.id, status: 'expired' });
    expect(db.requireTask(task.id)).toMatchObject({ status: 'failed', errorMessage: 'server_restarted' });
    db.finishTask(queued.id, 'cancelled', null);
    db.deleteAgent(agent.id);
    expect(db.listLogs('task', task.id)).toEqual([first, last]);
    expect(db.snapshot().agents.some(({ id }) => id === agent.id)).toBe(false);
  } finally {
    db.close();
  }
});
