import type { Execution } from '@agents-office-app/domain';

export function buildCliCommand(execution: Execution, prompt: string): string[] {
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
