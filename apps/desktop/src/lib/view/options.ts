import type { AgentRole, ProviderKind, ReasoningEffort } from '@agents-office-app/domain';

export const PROVIDERS: readonly ProviderKind[] = ['claude', 'codex', 'agy', 'demo'];
export const ROLES: readonly AgentRole[] = ['president', 'dept_manager', 'employee'];
export const EFFORTS: readonly ReasoningEffort[] = ['low', 'medium', 'high', 'xhigh'];
export const EFFORT_LABELS: Readonly<Record<ReasoningEffort, string>> = {
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '最高',
};
export const PROVIDER_SHORT: Readonly<Record<ProviderKind, string>> = {
  claude: 'claude',
  codex: 'codex',
  agy: 'agy',
  demo: 'demo',
};
