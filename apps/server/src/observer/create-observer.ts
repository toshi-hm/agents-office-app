import type { ExternalSession } from '@agents-office-app/domain';
import { parseProcessList } from './parse-process-list.ts';
import { readMacProcesses } from './read-processes.ts';

export type ObserverOptions = {
  readProcesses?: () => Promise<string>;
  managedPids?: () => ReadonlySet<number>;
  onChange?: () => void;
  intervalMs?: number;
};

export function createProcessObserver(options: ObserverOptions = {}) {
  let sessions: ExternalSession[] = [];
  let inFlight: Promise<void> | undefined;
  let closed = false;

  async function scan() {
    try {
      const output = await (options.readProcesses ?? readMacProcesses)();
      if (closed) return;
      const next = parseProcessList(output, options.managedPids?.());
      const changed = next.length !== sessions.length || next.some((session, index) =>
        session.pid !== sessions[index]?.pid || session.provider !== sessions[index]?.provider ||
        session.command !== sessions[index]?.command);
      sessions = next;
      if (changed) options.onChange?.();
    } catch {
      // Keep the previous observation if a process listing fails.
    }
  }

  function refresh() {
    if (closed) return Promise.resolve();
    return inFlight ??= scan().finally(() => { inFlight = undefined; });
  }

  const timer = setInterval(() => { void refresh(); }, options.intervalMs ?? 5000);
  void refresh();

  return {
    sessions: () => {
      const managed = options.managedPids?.();
      return sessions.filter(({ pid }) => !managed?.has(pid));
    },
    refresh,
    async close() {
      closed = true;
      clearInterval(timer);
      await inFlight;
    },
  };
}
