import type { Database } from 'bun:sqlite';
import type { Agent } from '@agents-office-app/domain';
import type { createAgentQueries } from './agents.ts';

export function seedDefaultOffice(sql: Database, createAgent: ReturnType<typeof createAgentQueries>['createAgent']) {
  sql.transaction(() => {
    if (sql.query('SELECT 1 FROM teams LIMIT 1').get()) return;
    const teams = [
      ['team-exec', '経営', 'executive', '#d97706'],
      ['team-dev', '開発部', 'department', '#2563eb'],
      ['team-note', 'note部', 'department', '#059669'],
      ['team-youtube', 'YouTube部', 'department', '#dc2626'],
    ];
    teams.forEach((group, index) => sql.run('INSERT INTO teams VALUES (?, ?, ?, ?, ?)', [...group, index]));
    const defaults = [
      ['agent-president', 'AI社長', 'team-exec', 'president', 'claude', 'claude-opus-4-6', 'high'],
      ['agent-dev-lead', '開発部長 (Codex)', 'team-dev', 'dept_manager', 'codex', 'gpt-5.4', 'high'],
      ['agent-dev-claude', 'Claude 開発担当', 'team-dev', 'employee', 'claude', 'claude-sonnet-4-6', 'medium'],
      ['agent-dev-agy', 'Agy 設計・検証担当', 'team-dev', 'employee', 'agy', 'gemini-pro', 'high'],
      ['agent-note-lead', 'note 編集長', 'team-note', 'dept_manager', 'claude', 'claude-sonnet-4-6', 'medium'],
      ['agent-yt-analyst', 'YouTube 分析担当', 'team-youtube', 'dept_manager', 'codex', 'gpt-5.4', 'medium'],
      ['agent-demo', 'デモ担当', 'team-dev', 'employee', 'demo', '', 'medium'],
    ] satisfies [string, string, string, Agent['role'], Agent['provider'], string, Agent['effort']][];
    for (const [id, displayName, teamId, role, provider, model, effort] of defaults) {
      createAgent({ displayName, teamId, role, provider, model, effort }, id);
    }
  }).immediate();
}
