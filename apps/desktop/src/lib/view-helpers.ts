import type {
  Agent,
  ApprovalRequest,
  CreateAgentInput,
  CreateTaskInput,
  ExecutionLog,
  OfficeHealth,
  OfficeSnapshot,
  ProviderKind,
  ReasoningEffort,
  Task,
  TaskStatus,
  Team,
  UpdateAgentInput,
  AgentRole,
} from '@agents-office-app/domain';

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

const ACTIVE_TASK_ORDER: Partial<Record<TaskStatus, number>> = {
  running: 0,
  waiting_approval: 1,
  queued: 2,
};

export function isTaskActive(status: TaskStatus): boolean {
  return ACTIVE_TASK_ORDER[status] !== undefined;
}

export type TeamGroup = Readonly<{ team: Team; agents: readonly Agent[] }>;

const ROLE_ORDER: Readonly<Record<AgentRole, number>> = {
  president: 0,
  dept_manager: 1,
  employee: 2,
};

export function groupAgentsByTeam(
  teams: readonly Team[],
  agents: readonly Agent[],
): readonly TeamGroup[] {
  const ordered = [...teams].sort((a, b) => a.sortOrder - b.sortOrder);
  const known = new Set(ordered.map((team) => team.id));
  for (const agent of agents) {
    if (known.has(agent.teamId)) continue;
    known.add(agent.teamId);
    ordered.push({
      id: agent.teamId,
      name: agent.teamName,
      kind: 'department',
      color: agent.avatarColor,
      sortOrder: Number.MAX_SAFE_INTEGER,
    });
  }
  return ordered.map((team) => ({
    team,
    agents: agents
      .filter((agent) => agent.teamId === team.id)
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]),
  }));
}

/** New work goes to the selected agent, otherwise to the president. */
export function getDefaultTargetAgentId(
  agents: readonly Agent[],
  selectedId: string | null,
): string {
  if (selectedId && agents.some((agent) => agent.id === selectedId)) return selectedId;
  return (agents.find((agent) => agent.role === 'president') ?? agents[0])?.id ?? '';
}

export function getPendingApprovals(
  approvals: readonly ApprovalRequest[],
  agentId?: string,
): readonly ApprovalRequest[] {
  return approvals
    .filter(
      (approval) =>
        approval.status === 'pending' && (agentId === undefined || approval.agentId === agentId),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** The task the inspector shows: live work first, otherwise the most recently touched one. */
export function getCurrentTask(tasks: readonly Task[], agentId: string): Task | null {
  const mine = tasks.filter((task) => task.agentId === agentId);
  const active = mine
    .filter((task) => isTaskActive(task.status))
    .sort(
      (a, b) =>
        ACTIVE_TASK_ORDER[a.status]! - ACTIVE_TASK_ORDER[b.status]! ||
        a.createdAt.localeCompare(b.createdAt),
    );
  if (active[0]) return active[0];
  return [...mine].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export type TaskFilter = 'all' | 'active' | 'finished';

export function filterTasks(tasks: readonly Task[], filter: TaskFilter): readonly Task[] {
  return tasks
    .filter(
      (task) => filter === 'all' || isTaskActive(task.status) === (filter === 'active'),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function countByActivity(snapshot: OfficeSnapshot) {
  const counts = { working: 0, waiting: 0, external: 0, error: 0 };
  for (const agent of snapshot.agents) {
    const activity = snapshot.agentActivities[agent.id];
    if (activity === 'working' || activity === 'starting') counts.working += 1;
    else if (activity === 'waiting_approval') counts.waiting += 1;
    else if (activity === 'external') counts.external += 1;
    else if (activity === 'error') counts.error += 1;
  }
  return counts;
}

export function formatSlotMeter(health: OfficeHealth | null | undefined): string {
  return health ? `${health.slotsUsed} / ${health.slotsTotal} 枠` : '– / 4 枠';
}

export function getTraySummary(snapshot: OfficeSnapshot) {
  return {
    runningCount: snapshot.health.runningExecutions,
    pendingApprovals: getPendingApprovals(snapshot.approvals).length,
  };
}

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

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return '';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 45) return 'たった今';
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}分前`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}時間前`;
  return `${Math.floor(seconds / 86_400)}日前`;
}

export function shortenPath(path: string): string {
  return path.replace(/^\/(?:Users|home)\/[^/]+(?=\/|$)/, '~');
}

// CSI and OSC terminal escape sequences, plus stray control characters.
const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)|\u001b\[[0-?]*[ -/]*[@-~]|\u001b[@-_]|[\u0000-\u0008\u000b-\u001f\u007f]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '');
}

export type LogSegment = Readonly<{ key: string; stream: ExecutionLog['stream']; text: string }>;

/**
 * The backend forwards CLI output in arbitrary chunks, so lines (and escape sequences) may be split.
 * Neighbouring chunks of one stream are joined; switching stream or run starts a new line.
 */
export function toLogSegments(logs: readonly ExecutionLog[]): readonly LogSegment[] {
  const runs: { key: string; group: string; stream: ExecutionLog['stream']; raw: string }[] = [];
  for (const log of logs) {
    const group = `${log.executionId}:${log.stream}`;
    const last = runs.at(-1);
    if (last?.group === group) last.raw += log.text;
    else runs.push({ key: `${log.executionId}:${log.id}`, group, stream: log.stream, raw: log.text });
  }
  return runs.map(({ key, stream, raw }, index) => {
    const text = stripAnsi(raw);
    const isLast = index === runs.length - 1;
    return {
      key,
      stream,
      text: isLast ? text.replace(/\n$/, '') : text.endsWith('\n') ? text : `${text}\n`,
    };
  });
}

export function getTaskLogs(
  logs: readonly ExecutionLog[],
  taskId: string | null,
): readonly ExecutionLog[] {
  return taskId ? logs.filter((log) => log.taskId === taskId) : logs;
}
