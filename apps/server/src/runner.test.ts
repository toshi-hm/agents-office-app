import { expect, test } from 'bun:test';
import { chmodSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { OfficeSseEvent, ProviderKind } from '@agents-office-app/domain';
import { openOfficeDb } from './db.ts';
import { createRunner } from './runner.ts';

test('launches each CLI in the task workspace, captures both streams, and escalates stop', async () => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'agents-office-runner-')));
  const oldPath = process.env.PATH;
  process.env.PATH = directory + ':' + oldPath;
  const db = openOfficeDb();
  const events: OfficeSseEvent[] = [];
  const runner = createRunner(db, (event) => events.push(event), () => {});
  try {
    const providers = ['claude', 'codex', 'agy'] as const;
    for (const provider of providers) {
      const executable = join(directory, provider);
      await Bun.write(executable, [
        '#!/usr/bin/env bun',
        "const args = process.argv.slice(2);",
        "if (args.includes('block')) process.on('SIGTERM', () => console.error('ignored SIGTERM'));",
        'console.log(JSON.stringify({ args, cwd: process.cwd() }));',
        "console.error('diagnostic');",
        "if (args.includes('block')) setInterval(() => {}, 1000);",
        "else if (args.includes('--print=fail')) process.exitCode = 17;",
      ].join('\n'));
      chmodSync(executable, 0o755);
    }

    function enqueue(provider: ProviderKind, prompt: string) {
      return runner.enqueue([{
        agentId: 'agent-demo', title: 'CLI', prompt, provider, model: 'test-model', workspacePath: directory,
      }])[0]!;
    }

    async function waitUntil(predicate: () => boolean) {
      for (let attempt = 0; attempt < 400; attempt++) {
        if (predicate()) return;
        await Bun.sleep(5);
      }
      throw new Error('Timed out waiting for CLI');
    }

    const expected = {
      claude: ['-p', '--output-format', 'text', '--model', 'test-model', '--', '-example'],
      codex: ['exec', '-m', 'test-model', '--', '-example'],
      agy: ['--output-format', 'text', '--model', 'test-model', '--print=-example'],
    };
    for (const provider of providers) {
      const task = enqueue(provider, '-example');
      await waitUntil(() => ['succeeded', 'failed'].includes(db.requireTask(task.id).status));
      const output = db.listLogs('task', task.id);
      expect({ status: db.requireTask(task.id).status, logs: output.map(({ text }) => text) })
        .toMatchObject({ status: 'succeeded' });
      expect(output.filter(({ stream }) => stream === 'stdout').map(({ text }) => text).join('')).toContain(
        JSON.stringify({ args: expected[provider], cwd: directory }),
      );
      expect(events.some((event) => event.type === 'log' && event.log.taskId === task.id && event.log.stream === 'stderr')).toBe(true);
    }

    const failed = enqueue('agy', 'fail');
    await waitUntil(() => db.requireTask(failed.id).status === 'failed');
    expect(db.requireTask(failed.id).errorMessage).toContain('supports --print');
    expect(db.snapshot().executions.find(({ taskId }) => taskId === failed.id)?.exitCode).toBe(17);

    const blocked = enqueue('codex', 'block');
    await waitUntil(() => db.listLogs('task', blocked.id).some(({ stream }) => stream === 'stdout'));
    const [pid] = runner.managedPids();
    expect(pid).toBeGreaterThan(0);
    const begin = performance.now();
    expect((await runner.stop(blocked.id)).status).toBe('cancelled');
    expect(performance.now() - begin).toBeGreaterThanOrEqual(700);
    expect(runner.managedPids().size).toBe(0);
    expect(db.snapshot().health.slotsUsed).toBe(0);
  } finally {
    await runner.close();
    db.close();
    if (oldPath === undefined) delete process.env.PATH;
    else process.env.PATH = oldPath;
    rmSync(directory, { recursive: true, force: true });
  }
});
