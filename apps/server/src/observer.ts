import type { ExternalSession } from '@agents-office-app/domain';
import { now } from './db.ts';

const providerPattern = /(?:^|[/\\])(claude|codex|agy)(?:\.exe)?$/;

function detectProvider(command: string) {
  if (/(?:^|\/)claude\/versions\/\d+\.\d+\.\d+$/.test(command)) return 'claude';
  const match = providerPattern.exec(command);
  if (!match) return undefined;
  return match[1] as ExternalSession['provider'];
}

export function parseProcessList(
  output: string,
  managedPids: ReadonlySet<number> = new Set(),
  observedAt = now(),
): ExternalSession[] {
  const sessions: ExternalSession[] = [];
  for (const line of output.split('\n')) {
    const match = /^\s*(\d+)\s+(\S+)(?:\s+(.+))?$/.exec(line);
    if (!match) continue;
    const pid = Number(match[1]);
    const executable = match[2]!;
    const command = match[3]?.trim() || executable;
    if (managedPids.has(pid)) continue;
    const args = command.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
    const first = args[0]?.replace(/^['"]|['"]$/g, '') ?? '';
    const script = args[1]?.replace(/^['"]|['"]$/g, '') ?? '';
    const interpreter = /(?:^|\/)(?:node|bun)(?:\.exe)?$/.test(executable);
    const provider = detectProvider(executable) ?? detectProvider(first) ??
      (interpreter && /(?:^|\/)(claude|codex|agy)\.(?:js|mjs|cjs)$/.test(script)
        ? detectProvider(script.replace(/\.(?:js|mjs|cjs)$/, ''))
        : undefined);
    if (provider) sessions.push({ pid, provider, command, cwd: null, observedAt });
  }
  return sessions.sort((a, b) => a.pid - b.pid);
}

async function readProcesses() {
  const child = Bun.spawn(['ps', '-eo', 'pid=,comm=,args='], { stdout: 'pipe', stderr: 'ignore' });
  const [output, code] = await Promise.all([new Response(child.stdout).text(), child.exited]);
  if (code) throw new Error('ps exited with code ' + code);
  return output;
}

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
      const output = await (options.readProcesses ?? readProcesses)();
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
