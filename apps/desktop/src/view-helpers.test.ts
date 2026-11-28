import { describe, expect, test } from 'bun:test';
import { isSubmitKey, matchShortcut } from './lib/shortcuts.ts';
import { nextTheme, parseThemePreference, resolveTheme } from './lib/theme.ts';
import {
  buildCreateAgentInput,
  buildTaskInput,
  buildUpdateAgentInput,
  changeTaskProvider,
  createAgentForm,
  createTaskForm,
  deriveTaskTitle,
  filterTasks,
  formatRelativeTime,
  formatSlotMeter,
  getCurrentTask,
  getDefaultTargetAgentId,
  getPendingApprovals,
  getTraySummary,
  groupAgentsByTeam,
  retargetTaskForm,
  shortenPath,
  stripAnsi,
  toLogSegments,
  validateAgentForm,
} from './lib/view-helpers.ts';
import { TEAMS, agent, approval, log, snapshot, task } from './test-fixtures.ts';

describe('roster helpers', () => {
  test('groups agents by team in sort order, keeping unknown teams', () => {
    const groups = groupAgentsByTeam(TEAMS, [
      agent('z', { teamId: 'ghost', teamName: '幽霊部' }),
      agent('e'),
      agent('m', { role: 'dept_manager' }),
    ]);
    expect(groups.map((g) => g.team.name)).toEqual(['経営', '開発部', '幽霊部']);
    expect(groups[1]!.agents.map((a) => a.id)).toEqual(['m', 'e']);
  });

  test('targets the selection, then the president', () => {
    const { agents } = snapshot();
    expect(getDefaultTargetAgentId(agents, 'a1')).toBe('a1');
    expect(getDefaultTargetAgentId(agents, null)).toBe('p1');
    expect(getDefaultTargetAgentId(agents, 'missing')).toBe('p1');
    expect(getDefaultTargetAgentId([], null)).toBe('');
  });
});

describe('task helpers', () => {
  const tasks = [
    task('queued', { status: 'queued', createdAt: '2026-01-03' }),
    task('running', { status: 'running', createdAt: '2026-01-01' }),
    task('done', { status: 'succeeded', createdAt: '2026-01-02', updatedAt: '2026-02-01' }),
    task('other', { agentId: 'p1', status: 'failed', createdAt: '2026-01-04' }),
  ];

  test('prefers running work over the queue and history', () => {
    expect(getCurrentTask(tasks, 'a1')?.id).toBe('running');
    expect(getCurrentTask(tasks, 'p1')?.id).toBe('other');
    expect(getCurrentTask(tasks, 'nobody')).toBeNull();
  });

  test('filters and orders newest first', () => {
    expect(filterTasks(tasks, 'active').map((t) => t.id)).toEqual(['queued', 'running']);
    expect(filterTasks(tasks, 'finished').map((t) => t.id)).toEqual(['other', 'done']);
    expect(filterTasks(tasks, 'all')).toHaveLength(4);
  });

  test('derives a short title from the first line', () => {
    expect(deriveTaskTitle('\n  最初の行  \n次')).toBe('最初の行');
    const long = deriveTaskTitle('あ'.repeat(80));
    expect([...long]).toHaveLength(40);
    expect(long.endsWith('…')).toBe(true);
    // Emoji are not cut in half.
    expect(/\p{Surrogate}/u.test(deriveTaskTitle('🌱'.repeat(50)))).toBe(false);
  });
});

describe('task form', () => {
  const claude = agent('c', { provider: 'claude', model: 'opus', effort: 'high' });

  test('starts from the agent settings', () => {
    expect(createTaskForm(claude)).toMatchObject({
      agentId: 'c',
      provider: 'claude',
      model: 'opus',
      effort: 'high',
    });
  });

  test('keeps typed text when the target changes', () => {
    const form = { ...createTaskForm(claude), prompt: '下書き', title: '件' };
    expect(retargetTaskForm(form, agent('d'))).toMatchObject({
      agentId: 'd',
      provider: 'demo',
      prompt: '下書き',
      title: '件',
    });
  });

  test('clears the model for another provider and restores it on return', () => {
    const switched = changeTaskProvider(createTaskForm(claude), 'codex', claude);
    expect(switched.model).toBe('');
    expect(changeTaskProvider(switched, 'claude', claude).model).toBe('opus');
  });

  test('omits empty overrides', () => {
    const input = buildTaskInput({
      ...createTaskForm(agent('d', { workspacePath: '' })),
      prompt: '  調べて  ',
    });
    expect(input).toEqual({
      title: '調べて',
      prompt: '調べて',
      agentId: 'd',
      kind: 'task',
      provider: 'demo',
      effort: 'medium',
    });
  });
});

describe('agent form', () => {
  test('defaults a new agent to the first department', () => {
    const form = createAgentForm(undefined, TEAMS);
    expect(form.teamId).toBe('dev');
    expect(validateAgentForm(form)).toContain('名前');
    expect(validateAgentForm({ ...form, displayName: '新人' })).toBeNull();
  });

  test('creates without empty optional fields', () => {
    const input = buildCreateAgentInput({
      ...createAgentForm(undefined, TEAMS),
      displayName: ' 新人 ',
    });
    expect(input.displayName).toBe('新人');
    expect(input).not.toHaveProperty('model');
    expect(input).not.toHaveProperty('workspacePath');
  });

  test('updates only changed fields and never blanks the workspace', () => {
    const before = agent('a1', { provider: 'claude', model: 'opus' });
    const form = createAgentForm(before, TEAMS);
    expect(buildUpdateAgentInput(before, form)).toEqual({});
    expect(
      buildUpdateAgentInput(before, { ...form, model: '', workspacePath: '  ', effort: 'low' }),
    ).toEqual({ model: '', effort: 'low' });
  });
});

describe('office summaries', () => {
  test('lists pending approvals oldest first', () => {
    const list = [
      approval('new', { createdAt: '2026-02-01' }),
      approval('done', { status: 'rejected' }),
      approval('old', { createdAt: '2026-01-01', agentId: 'p1' }),
    ];
    expect(getPendingApprovals(list).map((a) => a.id)).toEqual(['old', 'new']);
    expect(getPendingApprovals(list, 'a1').map((a) => a.id)).toEqual(['new']);
  });

  test('formats the slot meter and tray summary', () => {
    expect(formatSlotMeter(snapshot().health)).toBe('2 / 4 枠');
    expect(formatSlotMeter(null)).toBe('– / 4 枠');
    expect(getTraySummary(snapshot({ approvals: [approval('x')] }))).toEqual({
      runningCount: 2,
      pendingApprovals: 1,
    });
  });

  test('formats times and paths', () => {
    const now = Date.parse('2026-11-26T12:00:00Z');
    expect(formatRelativeTime('2026-11-26T11:59:40Z', now)).toBe('たった今');
    expect(formatRelativeTime('2026-11-26T11:55:00Z', now)).toBe('5分前');
    expect(formatRelativeTime('2026-11-26T09:00:00Z', now)).toBe('3時間前');
    expect(formatRelativeTime('2026-11-24T12:00:00Z', now)).toBe('2日前');
    expect(formatRelativeTime('nope', now)).toBe('');
    expect(shortenPath('/Users/someone/work/app')).toBe('~/work/app');
    expect(shortenPath('/opt/app')).toBe('/opt/app');
  });

  test('strips terminal escape sequences', () => {
    expect(stripAnsi('\u001b[32mok\u001b[0m\r\u001b]0;title\u0007 done\tend\n')).toBe(
      'ok done\tend\n',
    );
  });
});

describe('log segments', () => {
  test('joins chunks split mid-line and mid-escape', () => {
    const segments = toLogSegments([
      log(1, { text: '調べて\u001b[3' }),
      log(2, { text: '2mいます\u001b[0m\n次の行\n' }),
    ]);
    expect(segments.map((s) => s.text)).toEqual(['調べています\n次の行']);
  });

  test('breaks the line when the stream or run changes', () => {
    const segments = toLogSegments([
      log(1, { text: 'out' }),
      log(2, { text: 'err\n', stream: 'stderr' }),
      log(3, { text: 'again', executionId: 'e2' }),
    ]);
    expect(segments.map((s) => [s.stream, s.text])).toEqual([
      ['stdout', 'out\n'],
      ['stderr', 'err\n'],
      ['stdout', 'again'],
    ]);
  });
});

const key = (value: string, patch: object = {}) => ({
  key: value,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...patch,
});

describe('keyboard shortcuts', () => {
  test('maps the macOS commands', () => {
    expect(matchShortcut(key('n', { metaKey: true }))).toBe('new-task');
    expect(matchShortcut(key('m', { metaKey: true, shiftKey: true }))).toBe('toggle-mini');
    expect(matchShortcut(key('r', { metaKey: true }))).toBe('refresh');
    expect(matchShortcut(key('Escape'))).toBe('escape');
  });

  test('leaves other combinations alone', () => {
    expect(matchShortcut(key('n'))).toBeNull();
    expect(matchShortcut(key('m', { metaKey: true }))).toBeNull();
    expect(matchShortcut(key('n', { metaKey: true, shiftKey: true }))).toBeNull();
    expect(matchShortcut(key('r', { ctrlKey: true }))).toBeNull();
  });

  test('never interrupts Japanese input', () => {
    expect(matchShortcut(key('Escape', { isComposing: true }))).toBeNull();
    expect(matchShortcut(key('Escape', { keyCode: 229 }))).toBeNull();
    expect(isSubmitKey(key('Enter', { metaKey: true, isComposing: true }))).toBe(false);
    expect(isSubmitKey(key('Enter', { metaKey: true }))).toBe(true);
    expect(isSubmitKey(key('Enter'))).toBe(false);
  });
});

describe('theme', () => {
  test('defaults to light and cycles', () => {
    expect(parseThemePreference(null)).toBe('light');
    expect(parseThemePreference('purple')).toBe('light');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
    expect([nextTheme('light'), nextTheme('dark'), nextTheme('system')]).toEqual([
      'dark',
      'system',
      'light',
    ]);
  });
});
