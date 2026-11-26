import type { ExternalSession } from '@agents-office-app/domain';
import { now } from '../db/error.ts';
import { parseProcessLine } from './parse-ps-line.ts';

export function parseProcessList(
  output: string,
  managedPids: ReadonlySet<number> = new Set(),
  observedAt = now(),
): ExternalSession[] {
  const sessions: ExternalSession[] = [];
  for (const line of output.split('\n')) {
    const session = parseProcessLine(line, managedPids, observedAt);
    if (session) sessions.push(session);
  }
  return sessions.sort((a, b) => a.pid - b.pid);
}
