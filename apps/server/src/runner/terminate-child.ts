import type { Child } from './types.ts';

export async function terminateChildProcess(child: Child) {
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
