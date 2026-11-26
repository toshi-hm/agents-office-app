/** Shapes of the live office state and the pure helpers that derive the next one. */
import type { ExecutionLog, OfficeSnapshot } from '@agents-office-app/domain';
import { mergeLogs } from './merge-logs.ts';

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline';

export type OfficeState = Readonly<{
  connection: ConnectionState;
  snapshot: OfficeSnapshot | null;
  /** Buffered log lines per agent id. */
  logs: Readonly<Record<string, readonly ExecutionLog[]>>;
  error: string | null;
}>;

export const INITIAL_OFFICE_STATE: OfficeState = {
  connection: 'connecting',
  snapshot: null,
  logs: {},
  error: null,
};

export function upsert<T extends { id: string }>(items: readonly T[], item: T): readonly T[] {
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index < 0) return [item, ...items];
  return items.map((existing, i) => (i === index ? item : existing));
}

/** Adds incoming lines to each agent's buffer; null when nothing new arrived. */
export function appendLogs(
  current: OfficeState['logs'],
  incoming: readonly ExecutionLog[],
): OfficeState['logs'] | null {
  const byAgent = new Map<string, ExecutionLog[]>();
  for (const log of incoming) {
    const group = byAgent.get(log.agentId);
    if (group) group.push(log);
    else byAgent.set(log.agentId, [log]);
  }
  const logs = { ...current };
  let changed = false;
  for (const [agentId, lines] of byAgent) {
    const before = logs[agentId] ?? [];
    const after = mergeLogs(before, lines);
    if (after !== before) {
      logs[agentId] = after;
      changed = true;
    }
  }
  return changed ? logs : null;
}
