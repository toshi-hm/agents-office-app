import type { ExternalSession } from '@agents-office-app/domain';

const providerPattern = /(?:^|[/\\])(claude|codex|agy)(?:\.exe)?$/;

function detectProvider(command: string) {
  if (/(?:^|\/)claude\/versions\/\d+\.\d+\.\d+$/.test(command)) return 'claude';
  const match = providerPattern.exec(command);
  if (!match) return undefined;
  return match[1] as ExternalSession['provider'];
}

export function parseProcessLine(line: string, managedPids: ReadonlySet<number>, observedAt: string): ExternalSession | undefined {
  const match = /^\s*(\d+)\s+(\S+)(?:\s+(.+))?$/.exec(line);
  if (!match) return undefined;
  const pid = Number(match[1]);
  const executable = match[2]!;
  const command = match[3]?.trim() || executable;
  if (managedPids.has(pid)) return undefined;
  const args = command.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  const first = args[0]?.replace(/^['"]|['"]$/g, '') ?? '';
  const script = args[1]?.replace(/^['"]|['"]$/g, '') ?? '';
  const interpreter = /(?:^|\/)(?:node|bun)(?:\.exe)?$/.test(executable);
  const provider = detectProvider(executable) ?? detectProvider(first) ??
    (interpreter && /(?:^|\/)(claude|codex|agy)\.(?:js|mjs|cjs)$/.test(script)
      ? detectProvider(script.replace(/\.(?:js|mjs|cjs)$/, ''))
      : undefined);
  if (provider) return { pid, provider, command, cwd: null, observedAt };
}
