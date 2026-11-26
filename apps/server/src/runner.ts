import { acquireSlot, createSlotLedger, releaseSlot } from '@agents-office-app/domain';
import type { ApprovalDecision, CreateTaskInput, Execution, LogStream, OfficeSseEvent, Task } from '@agents-office-app/domain';
import { OfficeError, type OfficeDb } from './db.ts';

function command(execution: Execution, prompt: string): string[] {
  const model = execution.model;
  switch (execution.provider) {
    case 'claude':
      return ['claude', '-p', '--output-format', 'text', ...(model ? ['--model', model] : []), '--', prompt];
    case 'codex':
      return ['codex', 'exec', ...(model ? ['-m', model] : []), '--', prompt];
    case 'agy':
      return ['agy', '--output-format', 'text', ...(model ? ['--model', model] : []), '--print=' + prompt];
    case 'demo':
      throw new Error('Demo executions do not launch a CLI');
  }
}

type Child = ReturnType<typeof Bun.spawn<'ignore', 'pipe', 'pipe'>>;
type Run = {
  execution: Execution;
  abort: AbortController;
  child?: Child;
  done: Promise<void>;
  resolveApproval?: (decision: ApprovalDecision) => void;
};

export function createRunner(
  db: OfficeDb,
  publish: (event: OfficeSseEvent) => void,
  changed: () => void,
  demoStepMs = 450,
) {
  let ledger = createSlotLedger();
  const running = new Map<string, Run>();
  let stopAllCalls = 0;
  let closing = false;

  function log(execution: Execution, stream: LogStream, text: string) {
    if (text) publish({ type: 'log', log: db.appendLog(execution, stream, text) });
  }

  async function demo(run: Run, task: Task) {
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
        return { status: 'cancelled', summary: null, exitCode: null } as const;
      }
      signal.throwIfAborted();
    }
    const summary = task.title + 'のデモ作業が完了しました。';
    log(execution, 'stdout', summary + '\n');
    return { status: 'succeeded', summary, exitCode: 0 } as const;
  }

  async function cli(run: Run, task: Task) {
    const { execution, abort } = run;
    const isAgy = execution.provider === 'agy';
    const agyHint = ' Check that agy is installed, signed in, and supports --print in this workspace.';
    let child: Child;
    try {
      const args = command(execution, task.prompt);
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
    async function consume(stream: ReadableStream<Uint8Array>, name: 'stdout' | 'stderr') {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      const cancel = () => { void reader.cancel().catch(() => {}); };
      abort.signal.addEventListener('abort', cancel, { once: true });
      function onText(value: string) {
        log(execution, name, value);
        if (name === 'stdout') output = (output + value).slice(-2000);
      }
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          onText(decoder.decode(chunk.value, { stream: true }));
        }
        onText(decoder.decode());
      } finally {
        abort.signal.removeEventListener('abort', cancel);
        reader.releaseLock();
      }
    }
    const [exit, stdout, stderr] = await Promise.allSettled([
      child.exited, consume(child.stdout, 'stdout'), consume(child.stderr, 'stderr'),
    ]);
    if (exit.status === 'rejected') throw exit.reason;
    if (abort.signal.aborted) return { status: 'cancelled', summary: null, exitCode: exit.value } as const;
    if (stdout.status === 'rejected') throw stdout.reason;
    if (stderr.status === 'rejected') throw stderr.reason;
    if (exit.value !== 0) {
      const summary = execution.provider + ' exited with code ' + exit.value + '.' + (isAgy ? agyHint : '');
      log(execution, 'system', summary + '\n');
      return { status: 'failed', summary, exitCode: exit.value } as const;
    }
    return { status: 'succeeded', summary: output.trim() || 'Completed successfully.', exitCode: exit.value } as const;
  }

  async function execute(run: Run, task: Task) {
    const { execution, abort } = run;
    let result: { status: 'succeeded' | 'failed' | 'cancelled'; summary: string | null; exitCode: number | null };
    try {
      abort.signal.throwIfAborted();
      result = execution.provider === 'demo' ? await demo(run, task) : await cli(run, task);
    } catch (error) {
      const summary = error instanceof Error ? error.message : String(error);
      if (!abort.signal.aborted) log(execution, 'system', summary + '\n');
      result = { status: 'failed', summary, exitCode: null };
    }
    if (abort.signal.aborted) result = { ...result, status: 'cancelled', summary: null };
    const finished = db.finishExecution(execution, result.status, result.summary, result.exitCode);
    running.delete(task.id);
    ledger = releaseSlot(ledger, execution.id);
    for (const approval of finished.approvals) publish({ type: 'approval_decided', approval });
    publish({ type: 'task_finished', task: finished.task });
    changed();
    dispatch();
  }

  function dispatch() {
    if (closing || stopAllCalls > 0) return;
    for (const task of db.listQueued()) {
      const executionId = crypto.randomUUID();
      const claimed = acquireSlot(ledger, { executionId, agentId: task.agentId, taskId: task.id });
      if (!claimed.ok) {
        if (claimed.code === 'no_free_slot') break;
        continue;
      }
      const execution = db.beginExecution(executionId, task, claimed.slotNo);
      ledger = claimed.ledger;
      const run: Run = {
        execution,
        abort: new AbortController(),
        done: Promise.resolve().then(() => execute(run, task)),
      };
      running.set(task.id, run);
      changed();
    }
  }

  function enqueue(inputs: readonly CreateTaskInput[]) {
    if (closing) throw new OfficeError(409, 'Server is shutting down');
    const tasks = db.sql.transaction(() => inputs.map(db.createTask))();
    if (tasks.length) changed();
    dispatch();
    return tasks;
  }

  async function stop(id: string) {
    const task = db.requireTask(id);
    const run = running.get(id);
    if (!run) {
      if (task.status !== 'queued') return task;
      const cancelled = db.finishTask(id, 'cancelled', null);
      publish({ type: 'task_finished', task: cancelled });
      changed();
      dispatch();
      return cancelled;
    }
    if (!run.abort.signal.aborted) {
      db.setExecutionStatus(run.execution.id, 'stopping');
      run.abort.abort();
      changed();
      if (run.child && run.child.exitCode === null && run.child.signalCode === null) {
        const child = run.child;
        child.kill('SIGTERM');
        const timer = setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        }, 750);
        try {
          await child.exited;
        } finally {
          clearTimeout(timer);
        }
      }
    }
    await run.done;
    return db.requireTask(id);
  }

  async function stopAll() {
    stopAllCalls++;
    try {
      const ids = [...db.listQueued().map((task) => task.id), ...running.keys()];
      await Promise.all(ids.map(stop));
    } finally {
      stopAllCalls--;
      dispatch();
    }
  }

  function decide(id: string, decision: ApprovalDecision) {
    const approval = db.decideApproval(id, decision);
    running.get(approval.taskId)?.resolveApproval?.(decision);
    publish({ type: 'approval_decided', approval });
    changed();
    return approval;
  }

  db.recover();
  return {
    dispatch, enqueue, stop, stopAll, decide,
    managedPids: () => new Set(Array.from(running.values()).flatMap(({ child }) => child ? [child.pid] : [])),
    async close() {
      closing = true;
      await Promise.all([...running.keys()].map(stop));
    },
  };
}
