import type {
  Agent,
  CreateTaskInput,
  ProviderKind,
  ReasoningEffort,
} from '@agents-office-app/domain';

export const TITLE_LIMIT = 40;

export function deriveTaskTitle(prompt: string): string {
  const firstLine =
    prompt
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) ?? '';
  const characters = [...firstLine];
  return characters.length > TITLE_LIMIT
    ? `${characters.slice(0, TITLE_LIMIT - 1).join('')}…`
    : firstLine;
}

export type TaskForm = Readonly<{
  title: string;
  prompt: string;
  agentId: string;
  provider: ProviderKind;
  model: string;
  effort: ReasoningEffort;
  workspacePath: string;
}>;

export function createTaskForm(agent: Agent | undefined): TaskForm {
  return {
    title: '',
    prompt: '',
    agentId: agent?.id ?? '',
    provider: agent?.provider ?? 'demo',
    model: agent?.model ?? '',
    effort: agent?.effort ?? 'medium',
    workspacePath: agent?.workspacePath ?? '',
  };
}

/** Switching the target agent keeps the text but adopts that agent's settings. */
export function retargetTaskForm(form: TaskForm, agent: Agent | undefined): TaskForm {
  return { ...createTaskForm(agent), title: form.title, prompt: form.prompt };
}

/** A model name belongs to one provider, so changing provider clears (or restores) it. */
export function changeTaskProvider(
  form: TaskForm,
  provider: ProviderKind,
  agent: Agent | undefined,
): TaskForm {
  return { ...form, provider, model: agent?.provider === provider ? agent.model : '' };
}

/** Empty overrides are omitted so the backend applies the agent's defaults. */
export function buildTaskInput(form: TaskForm): CreateTaskInput {
  const prompt = form.prompt.trim();
  const model = form.model.trim();
  const workspacePath = form.workspacePath.trim();
  return {
    title: form.title.trim() || deriveTaskTitle(prompt),
    prompt,
    agentId: form.agentId,
    kind: 'task',
    provider: form.provider,
    effort: form.effort,
    ...(model ? { model } : {}),
    ...(workspacePath ? { workspacePath } : {}),
  };
}
