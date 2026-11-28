import type { Task } from '@agents-office-app/domain';
import { buildCliCommand } from './build-cli-command.ts';
import { consumeProcessStream } from './stream-output.ts';
import type { Child, ExecutionResult, Run, RunContext } from './types.ts';

export async function runCliExecution(
  run: Run, task: Task, { db, changed, log }: RunContext,
): Promise<ExecutionResult> {
  const { execution, abort } = run;
  const isAgy = execution.provider === 'agy';
  const agyHint = ' Check that agy is installed, signed in, and supports --print in this workspace.';
  let child: Child;
  try {
    const args = buildCliCommand(execution, task.prompt);
    const executable = Bun.which(execution.provider, { PATH: process.env.PATH });
    if (!executable) throw new Error('Executable not found on PATH');
    args[0] = executable;
    child = Bun.spawn(args, {
      cwd: execution.workspacePath,
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
    });
  } catch (error) {
    throw new Error('Could not start ' + execution.provider + ' in ' + execution.workspacePath + ': ' +
      (error instanceof Error ? error.message : String(error)) + (isAgy ? agyHint : ' Check the CLI installation and workspace path.'));
  }
  run.child = child;
  db.setExecutionStatus(execution.id, 'active', child.pid);
  changed();

  let output = '';
  const [exit, stdout, stderr] = await Promise.allSettled([
    child.exited,
    consumeProcessStream(child.stdout, abort.signal, (value) => {
      log(execution, 'stdout', value);
      output = (output + value).slice(-2000);
    }),
    consumeProcessStream(child.stderr, abort.signal, (value) => log(execution, 'stderr', value)),
  ]);
  if (exit.status === 'rejected') throw exit.reason;
  if (abort.signal.aborted) return { status: 'cancelled', summary: null, exitCode: exit.value };
  if (stdout.status === 'rejected') throw stdout.reason;
  if (stderr.status === 'rejected') throw stderr.reason;
  if (exit.value !== 0) {
    const summary = execution.provider + ' exited with code ' + exit.value + '.' + (isAgy ? agyHint : '');
    log(execution, 'system', summary + '\n');
    return { status: 'failed', summary, exitCode: exit.value };
  }
  return { status: 'succeeded', summary: output.trim() || 'Completed successfully.', exitCode: exit.value };
}
