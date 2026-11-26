import type { ApprovalDecision, Task } from '@agents-office-app/domain';
import type { ExecutionResult, Run, RunContext } from './types.ts';

export async function runDemoExecution(
  run: Run, task: Task, { db, changed, log, publish }: RunContext, demoStepMs: number,
): Promise<ExecutionResult> {
  const { execution, abort } = run;
  const { signal } = abort;
  db.setExecutionStatus(execution.id, 'active');
  changed();
  const steps = ['依頼内容を確認しています。', '作業方針を整理しています。', '成果物を確認しています。'];
  for (const message of steps) {
    signal.throwIfAborted();
    log(execution, 'stdout', message + '\n');
    await new Promise<void>((resolve) => {
      function finish() {
        clearTimeout(timer);
        signal.removeEventListener('abort', finish);
        resolve();
      }
      const timer = setTimeout(finish, demoStepMs);
      signal.addEventListener('abort', finish, { once: true });
    });
  }
  signal.throwIfAborted();
  if (/承認|approve/i.test(task.prompt)) {
    const decision = await new Promise<ApprovalDecision | undefined>((resolve) => {
      abort.signal.addEventListener('abort', () => resolve(undefined), { once: true });
      const approval = db.requestApproval(execution);
      run.resolveApproval = resolve;
      publish({ type: 'approval_requested', approval });
      changed();
    });
    if (decision !== 'allow') {
      log(execution, 'system', decision === 'deny' ? '承認が拒否されました。\n' : '承認待ちを停止しました。\n');
      return { status: 'cancelled', summary: null, exitCode: null };
    }
    signal.throwIfAborted();
  }
  const summary = task.title + 'のデモ作業が完了しました。';
  log(execution, 'stdout', summary + '\n');
  return { status: 'succeeded', summary, exitCode: 0 };
}
