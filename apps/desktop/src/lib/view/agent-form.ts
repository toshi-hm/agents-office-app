import type {
  Agent,
  AgentRole,
  ProviderKind,
  ReasoningEffort,
  Team,
} from '@agents-office-app/domain';

export const AVATAR_COLORS: readonly string[] = [
  '#c58b4e',
  '#5f8f6b',
  '#4f9d9a',
  '#c9605a',
  '#6c7fc4',
  '#a876b8',
  '#d9a23b',
  '#7b8a8f',
];

export type AgentForm = Readonly<{
  displayName: string;
  role: AgentRole;
  teamId: string;
  provider: ProviderKind;
  model: string;
  effort: ReasoningEffort;
  workspacePath: string;
  avatarColor: string;
}>;

export function createAgentForm(agent: Agent | undefined, teams: readonly Team[]): AgentForm {
  if (agent) {
    return {
      displayName: agent.displayName,
      role: agent.role,
      teamId: agent.teamId,
      provider: agent.provider,
      model: agent.model,
      effort: agent.effort,
      workspacePath: agent.workspacePath,
      avatarColor: agent.avatarColor,
    };
  }
  const team =
    [...teams].sort((a, b) => a.sortOrder - b.sortOrder).find((t) => t.kind === 'department') ??
    teams[0];
  return {
    displayName: '',
    role: 'employee',
    teamId: team?.id ?? '',
    provider: 'claude',
    model: '',
    effort: 'medium',
    workspacePath: '',
    avatarColor: team?.color ?? AVATAR_COLORS[1]!,
  };
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function validateAgentForm(form: AgentForm): string | null {
  if (!form.displayName.trim()) return '名前を入力してください';
  if (!form.teamId) return 'チームを選んでください';
  return null;
}
