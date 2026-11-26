import type { Agent, ExternalSession } from '../types/index.ts';

/** Assigns external CLI sessions 1-to-1 so a single external process never marks every agent. */
export function matchExternalSessions(
  idleCandidates: readonly Agent[],
  externalSessions: readonly ExternalSession[],
): ReadonlySet<string> {
  const remaining = [...externalSessions];
  const matched = new Set<string>();

  for (const agent of idleCandidates) {
    if (!agent.workspacePath) continue;
    const idx = remaining.findIndex(
      (session) =>
        session.provider === agent.provider &&
        session.cwd !== null &&
        session.cwd.startsWith(agent.workspacePath),
    );
    if (idx !== -1) {
      remaining.splice(idx, 1);
      matched.add(agent.id);
    }
  }

  for (const agent of idleCandidates) {
    if (matched.has(agent.id)) continue;
    const idx = remaining.findIndex(
      (session) => session.provider === agent.provider && session.cwd === null,
    );
    if (idx !== -1) {
      remaining.splice(idx, 1);
      matched.add(agent.id);
    }
  }

  return matched;
}
