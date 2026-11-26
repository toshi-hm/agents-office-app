import type { ExecutionLog } from '@agents-office-app/domain';

export const LOG_BUFFER_LIMIT = 500;

function compareLogs(left: ExecutionLog, right: ExecutionLog): number {
  if (left.timestamp !== right.timestamp) return left.timestamp < right.timestamp ? -1 : 1;
  return left.id - right.id;
}

/** Merges log lines without duplicates, oldest first, keeping only the newest `limit` lines. */
export function mergeLogs(
  current: readonly ExecutionLog[],
  incoming: readonly ExecutionLog[],
  limit = LOG_BUFFER_LIMIT,
): readonly ExecutionLog[] {
  const key = (log: ExecutionLog) => `${log.executionId}:${log.id}`;
  const seen = new Set(current.map(key));
  const fresh = incoming.filter((log) => {
    if (seen.has(key(log))) return false;
    seen.add(key(log));
    return true;
  });
  if (fresh.length === 0) return current;
  const merged = [...current, ...fresh].sort(compareLogs);
  return merged.length > limit ? merged.slice(merged.length - limit) : merged;
}
