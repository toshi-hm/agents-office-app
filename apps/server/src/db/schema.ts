import type { Database } from 'bun:sqlite';

export const activeStatuses = "'reserved', 'starting', 'active', 'waiting_approval', 'stopping'";

export function initializeSchema(sql: Database) {
  sql.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, color TEXT NOT NULL,
      sortOrder INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY, displayName TEXT NOT NULL, role TEXT NOT NULL,
      teamId TEXT NOT NULL REFERENCES teams(id), provider TEXT NOT NULL, model TEXT NOT NULL,
      effort TEXT NOT NULL, workspacePath TEXT NOT NULL, avatarColor TEXT NOT NULL,
      statusNote TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, prompt TEXT NOT NULL, kind TEXT NOT NULL,
      status TEXT NOT NULL, agentId TEXT NOT NULL REFERENCES agents(id), provider TEXT NOT NULL,
      model TEXT NOT NULL, effort TEXT NOT NULL, workspacePath TEXT NOT NULL, createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL, completedAt TEXT, resultSummary TEXT, errorMessage TEXT
    );
    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY, taskId TEXT NOT NULL REFERENCES tasks(id), agentId TEXT NOT NULL REFERENCES agents(id),
      slotNo INTEGER CHECK (slotNo BETWEEN 1 AND 4), provider TEXT NOT NULL, model TEXT NOT NULL,
      effort TEXT NOT NULL, pid INTEGER, status TEXT NOT NULL, workspacePath TEXT NOT NULL,
      startedAt TEXT NOT NULL, finishedAt TEXT, exitCode INTEGER, summary TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS executions_active_slot ON executions(slotNo) WHERE status IN (${activeStatuses});
    CREATE UNIQUE INDEX IF NOT EXISTS executions_active_agent ON executions(agentId) WHERE status IN (${activeStatuses});
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY, executionId TEXT NOT NULL REFERENCES executions(id),
      taskId TEXT NOT NULL REFERENCES tasks(id), agentId TEXT NOT NULL REFERENCES agents(id),
      toolName TEXT NOT NULL, summary TEXT NOT NULL, detail TEXT NOT NULL, status TEXT NOT NULL,
      decision TEXT, createdAt TEXT NOT NULL, decidedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS execution_logs (
      id INTEGER PRIMARY KEY, executionId TEXT NOT NULL REFERENCES executions(id),
      taskId TEXT NOT NULL REFERENCES tasks(id), agentId TEXT NOT NULL REFERENCES agents(id),
      stream TEXT NOT NULL, text TEXT NOT NULL, timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS tasks_queue ON tasks(status, createdAt);
    CREATE INDEX IF NOT EXISTS logs_task ON execution_logs(taskId, id);
    CREATE INDEX IF NOT EXISTS logs_agent ON execution_logs(agentId, id);
    CREATE INDEX IF NOT EXISTS approvals_execution ON approvals(executionId, status);
  `);
}
