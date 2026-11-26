import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentInspector } from './components/AgentInspector.tsx';
import type { OfficeActions } from './components/actions.ts';
import { MiniOfficeHud } from './components/MiniOfficeHud.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { TaskModal } from './components/TaskModal.tsx';
import { TitleBar } from './components/TitleBar.tsx';
import { approval, log, snapshot, task } from './test-fixtures.ts';

const noop = () => {};
const actions: OfficeActions = {
  select: noop,
  decide: noop,
  stopTask: noop,
  assign: async () => true,
  openTaskModal: noop,
  openAgentModal: noop,
  deleteAgent: noop,
  openInFinder: noop,
  openInTerminal: noop,
  runDemo: noop,
  isBusy: () => false,
};
const busy = snapshot({
  tasks: [task('t1', { status: 'waiting_approval', title: 'リリース作業' })],
  approvals: [approval('ap1')],
  agentActivities: { a1: 'waiting_approval', p1: 'idle' },
  externalSessions: [
    {
      pid: 42,
      provider: 'codex',
      command: 'codex exec',
      cwd: '/Users/someone/app',
      observedAt: '2026-11-26T10:00:00.000Z',
    },
  ],
});

describe('desktop screens', () => {
  test('title bar shows slots, approvals and every command', () => {
    const html = renderToStaticMarkup(
      createElement(TitleBar, {
        health: busy.health,
        pendingApprovals: 1,
        ready: true,
        demoBusy: false,
        pinned: false,
        theme: 'light',
        onShowApprovals: noop,
        onDemo: noop,
        onNewTask: noop,
        onNewAgent: noop,
        onTogglePin: noop,
        onMini: noop,
        onThemeChange: noop,
      }),
    );
    for (const text of [
      '2 / 4 枠',
      '承認待ち 1',
      'デモ実行',
      '仕事を依頼',
      '社員追加',
      '小さなオフィス',
      '常に手前に表示',
      'data-tauri-drag-region',
    ]) {
      expect(html).toContain(text);
    }
  });

  test('sidebar lists agents by team and external CLI sessions', () => {
    const html = renderToStaticMarkup(
      createElement(Sidebar, {
        snapshot: busy,
        selectedId: 'a1',
        tab: 'agents',
        onTabChange: noop,
        actions,
      }),
    );
    expect(html.indexOf('経営')).toBeLessThan(html.indexOf('開発部'));
    expect(html).toContain('承認待ち');
    expect(html).toContain('PID 42');
    expect(html).toContain('~/app');
  });

  test('inspector puts the approval and live log of the selected agent on screen', () => {
    const html = renderToStaticMarkup(
      createElement(AgentInspector, {
        snapshot: busy,
        agent: busy.agents[0]!,
        logs: [log(1, { text: '\u001b[31m赤い出力\u001b[0m' }), log(2, { taskId: 'old' })],
        actions,
      }),
    );
    for (const text of ['許可', '却下', 'git push', 'リリース作業', '停止', 'かんたん依頼', '赤い出力']) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain('line 2');
    expect(html).not.toContain('[31m');
  });

  test('inspector without a selection summarises the office', () => {
    const html = renderToStaticMarkup(
      createElement(AgentInspector, { snapshot: busy, agent: null, logs: [], actions }),
    );
    expect(html).toContain('承認の順番待ち');
    expect(html).toContain('社員a1からの依頼');
    expect(html).toContain('デモで試す');
  });

  test('mini office offers approval and expand from the popover', () => {
    const html = renderToStaticMarkup(
      createElement(MiniOfficeHud, {
        snapshot: busy,
        connection: 'live',
        error: null,
        selectedId: 'a1',
        theme: 'light',
        native: true,
        pinned: true,
        actions,
        onTogglePin: noop,
        onExpand: noop,
        onRetry: noop,
      }),
    );
    for (const text of ['稼働 1', '承認 1', '拡大', '詳細を開く', '許可', '却下', '停止']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('data-compact="true"');
  });

  test('task dialog defaults to the requested agent', () => {
    const html = renderToStaticMarkup(
      createElement(TaskModal, {
        snapshot: busy,
        agentId: 'p1',
        canBrowse: false,
        onPickDirectory: async () => null,
        onSubmit: async () => {},
        onClose: noop,
      }),
    );
    expect(html).toContain('<option value="p1" selected="">社長さん（社長）</option>');
    expect(html).toContain('Antigravity');
    expect(html).toContain('フォルダ選択はデスクトップアプリで利用できます');
  });
});
