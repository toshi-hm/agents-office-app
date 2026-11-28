import type { ExecutionLog } from '@agents-office-app/domain';

// CSI and OSC terminal escape sequences, plus stray control characters.
const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)|\u001b\[[0-?]*[ -/]*[@-~]|\u001b[@-_]|[\u0000-\u0008\u000b-\u001f\u007f]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '');
}

export type LogSegment = Readonly<{ key: string; stream: ExecutionLog['stream']; text: string }>;

/**
 * The backend forwards CLI output in arbitrary chunks, so lines (and escape sequences) may be split.
 * Neighbouring chunks of one stream are joined; switching stream or run starts a new line.
 */
export function toLogSegments(logs: readonly ExecutionLog[]): readonly LogSegment[] {
  const runs: { key: string; group: string; stream: ExecutionLog['stream']; raw: string }[] = [];
  for (const log of logs) {
    const group = `${log.executionId}:${log.stream}`;
    const last = runs.at(-1);
    if (last?.group === group) last.raw += log.text;
    else runs.push({ key: `${log.executionId}:${log.id}`, group, stream: log.stream, raw: log.text });
  }
  return runs.map(({ key, stream, raw }, index) => {
    const text = stripAnsi(raw);
    const isLast = index === runs.length - 1;
    return {
      key,
      stream,
      text: isLast ? text.replace(/\n$/, '') : text.endsWith('\n') ? text : `${text}\n`,
    };
  });
}

export function getTaskLogs(
  logs: readonly ExecutionLog[],
  taskId: string | null,
): readonly ExecutionLog[] {
  return taskId ? logs.filter((log) => log.taskId === taskId) : logs;
}
