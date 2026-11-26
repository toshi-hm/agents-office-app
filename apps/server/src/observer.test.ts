import { expect, test } from 'bun:test';
import { createProcessObserver, parseProcessList } from './observer.ts';

const processes = [
  ' 113 /Users/user/.loc /Users/user/.local/bin/agy --print hello',
  ' 100 /usr/local/bin/claude claude -p hello',
  ' 101 /usr/local/bin/codex codex exec hello',
  ' 104 /opt/bin/node node /opt/lib/claude.js --print hello',
  ' 105 /Users/user/.loc /Users/user/.local/share/claude/versions/2.1.330 --print hello',
  ' 999 /bin/sh sh -c "run claude"',
  ' 998 /usr/bin/grep grep codex',
  ' invalid',
].join('\n');

test('parses actual executables, including truncated macOS comm and JS entrypoints', () => {
  const observedAt = '2026-11-26T00:00:00.000Z';
  const sessions = parseProcessList(processes, new Set([101]), observedAt);
  expect(sessions.map(({ pid, provider }) => [pid, provider])).toEqual([[100, 'claude'], [104, 'claude'], [105, 'claude'], [113, 'agy']]);
  expect(sessions.every((session) => session.observedAt === observedAt && session.cwd === null)).toBe(true);
});

test('observer refreshes with injectable process listings and managed PIDs', async () => {
  let output = processes;
  const managed = new Set([100]);
  let changes = 0;
  const observer = createProcessObserver({
    readProcesses: async () => output, managedPids: () => managed, onChange: () => { changes++; },
  });
  try {
    await observer.refresh();
    expect(observer.sessions().map(({ pid }) => pid)).toEqual([101, 104, 105, 113]);
    managed.add(104);
    expect(observer.sessions().map(({ pid }) => pid)).toEqual([101, 105, 113]);
    output = '';
    await observer.refresh();
    expect(observer.sessions()).toEqual([]);
    expect(changes).toBe(2);
  } finally {
    await observer.close();
  }
});
