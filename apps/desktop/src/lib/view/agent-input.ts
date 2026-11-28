import type { Agent, CreateAgentInput, UpdateAgentInput } from '@agents-office-app/domain';
import { isHexColor } from './agent-form.ts';
import type { AgentForm } from './agent-form.ts';

export function buildCreateAgentInput(form: AgentForm): CreateAgentInput {
  const model = form.model.trim();
  const workspacePath = form.workspacePath.trim();
  return {
    displayName: form.displayName.trim(),
    role: form.role,
    teamId: form.teamId,
    provider: form.provider,
    effort: form.effort,
    ...(model ? { model } : {}),
    ...(workspacePath ? { workspacePath } : {}),
    ...(isHexColor(form.avatarColor) ? { avatarColor: form.avatarColor } : {}),
  };
}

/** Only changed fields are sent. An empty workspace path means "keep the current one". */
export function buildUpdateAgentInput(agent: Agent, form: AgentForm): UpdateAgentInput {
  const next = {
    displayName: form.displayName.trim(),
    role: form.role,
    teamId: form.teamId,
    provider: form.provider,
    model: form.model.trim(),
    effort: form.effort,
    workspacePath: form.workspacePath.trim() || agent.workspacePath,
    avatarColor: isHexColor(form.avatarColor) ? form.avatarColor : agent.avatarColor,
  };
  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => agent[key as keyof typeof next] !== value),
  ) as UpdateAgentInput;
}
