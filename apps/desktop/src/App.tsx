import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WindowMode } from '@agents-office-app/domain';
import { AgentInspector } from './components/AgentInspector.tsx';
import { AgentModal } from './components/AgentModal.tsx';
import { CenterStage } from './components/CenterStage.tsx';
import { MiniOfficeHud } from './components/MiniOfficeHud.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import type { SidebarTab } from './components/Sidebar.tsx';
import { TaskModal } from './components/TaskModal.tsx';
import { TitleBar } from './components/TitleBar.tsx';
import type { OfficeActions } from './components/actions.ts';
import { useOffice } from './hooks/useOffice.ts';
import { useTheme } from './hooks/useTheme.ts';
import { useToasts } from './hooks/useToasts.ts';
import type { OfficeNotification } from './lib/api-client.ts';
import { matchShortcut } from './lib/shortcuts.ts';
import type { ShortcutAction } from './lib/shortcuts.ts';
import { createTauriBridge, describeError } from './lib/tauri-bridge.ts';
import type { TauriBridge, TrayAction } from './lib/tauri-bridge.ts';
import {
  buildCreateAgentInput,
  buildUpdateAgentInput,
  deriveTaskTitle,
  getDefaultTargetAgentId,
  getPendingApprovals,
  getTraySummary,
} from './lib/view-helpers.ts';

type ModalState =
  | Readonly<{ type: 'task'; agentId?: string | undefined }>
  | Readonly<{ type: 'agent'; agentId?: string | undefined }>
  | null;

const defaultBridge = createTauriBridge();
const NO_LOGS: readonly never[] = [];

function isTextField(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function App({ bridge = defaultBridge }: { bridge?: TauriBridge }) {
  const { preference, setPreference, theme } = useTheme();
  const { toasts, push, dismiss } = useToasts();

  const notify = useCallback(
    (notification: OfficeNotification) => {
      push({
        tone: notification.kind === 'approval' ? 'warning' : 'info',
        title: notification.title,
        body: notification.body,
        agentId: notification.agentId,
      });
      bridge
        .sendNativeNotification(notification.title, notification.body)
        .catch((error: unknown) => console.error('[notification]', error));
    },
    [bridge, push],
  );
  const { api, store, state } = useOffice(bridge, notify);
  const { snapshot, connection } = state;

  const [mode, setMode] = useState<WindowMode>('full');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<SidebarTab>('agents');
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const busyKeys = useRef(new Set<string>());
  // The mini office floats above other windows by default; the full window does not.
  const [pins, setPins] = useState<Readonly<Record<WindowMode, boolean>>>({
    full: false,
    mini: true,
  });
  const pinned = pins[mode];

  const fail = useCallback(
    (error: unknown) => push({ tone: 'error', title: describeError(error) }),
    [push],
  );

  /** Runs one user action at a time per key; resolves false after reporting a failure. */
  const run = useCallback(
    async (key: string, action: () => Promise<void>): Promise<boolean> => {
      if (busyKeys.current.has(key)) return false;
      busyKeys.current.add(key);
      setBusy(new Set(busyKeys.current));
      try {
        await action();
        return true;
      } catch (error) {
        fail(error);
        return false;
      } finally {
        busyKeys.current.delete(key);
        setBusy(new Set(busyKeys.current));
      }
    },
    [fail],
  );

  const changeMode = useCallback(
    (next: WindowMode) => {
      void run('window-mode', async () => {
        setMode(await bridge.setWindowMode(next));
        setModal(null);
      });
    },
    [bridge, run],
  );

  // The shell changes always-on-top on its own when resizing, so re-assert the chosen value.
  useEffect(() => {
    bridge.setAlwaysOnTop(pinned).catch(fail);
  }, [bridge, fail, mode, pinned]);

  const togglePin = () => setPins((current) => ({ ...current, [mode]: !current[mode] }));

  const refresh = useCallback(() => void store.refresh(), [store]);

  const openTaskModal = useCallback(
    (agentId?: string) => {
      if (!snapshot) return;
      setModal({ type: 'task', agentId });
    },
    [snapshot],
  );

  const handleCommand = useCallback(
    (command: ShortcutAction | TrayAction) => {
      if (command === 'escape') {
        if (modal) setModal(null);
        else setSelectedId(null);
        return;
      }
      if (command === 'refresh') {
        refresh();
        return;
      }
      // An open dialog holds typed text; only Escape or its own buttons may discard it.
      if (command === 'toggle-mini') {
        if (!modal) changeMode(mode === 'full' ? 'mini' : 'full');
        return;
      }
      if (modal || !snapshot) return;
      if (mode === 'mini') {
        void run('window-mode', async () => {
          setMode(await bridge.setWindowMode('full'));
          openTaskModal();
        });
      } else {
        openTaskModal();
      }
    },
    [bridge, changeMode, modal, mode, openTaskModal, refresh, run, snapshot],
  );

  // Listeners are registered once and always call the latest handler.
  const command = useRef(handleCommand);
  command.current = handleCommand;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const action = matchShortcut(event);
      if (!action) return;
      event.preventDefault();
      // Escape first leaves a text field, so a draft is not lost with the selection.
      const field = event.target;
      if (action === 'escape' && isTextField(field) && !field.closest('[role=dialog]')) {
        field.blur();
        return;
      }
      if (!event.repeat) command.current(action);
    };
    window.addEventListener('keydown', handleKey);
    const stopModes = bridge.onWindowModeChanged((next) => {
      setMode(next);
      if (next === 'mini') setModal(null);
    });
    const stopTray = bridge.onTrayAction((action) => command.current(action));
    return () => {
      window.removeEventListener('keydown', handleKey);
      stopModes();
      stopTray();
    };
  }, [bridge]);

  const summary = snapshot ? getTraySummary(snapshot) : null;
  const runningCount = summary?.runningCount;
  const pendingCount = summary?.pendingApprovals;
  useEffect(() => {
    if (runningCount === undefined || pendingCount === undefined) return;
    bridge
      .updateTraySummary(runningCount, pendingCount)
      .catch((error: unknown) => console.error('[tray]', error));
  }, [bridge, runningCount, pendingCount]);

  const selected = snapshot?.agents.find((agent) => agent.id === selectedId) ?? null;
  // Drop a selection that points at an agent which no longer exists.
  useEffect(() => {
    if (selectedId && snapshot && !selected) setSelectedId(null);
  }, [selectedId, snapshot, selected]);

  const live = connection === 'live';
  useEffect(() => {
    if (selectedId) void store.loadAgentLogs(selectedId);
  }, [selectedId, live, store]);

  const openPath = (key: 'finder' | 'terminal', path: string) => {
    void run(`open:${key}`, async () => {
      const opened =
        key === 'finder'
          ? await bridge.openPathInFinder(path)
          : await bridge.openPathInTerminal(path);
      if (!opened) {
        push({ tone: 'info', title: 'ブラウザプレビューでは開けません', body: path });
      }
    });
  };

  const actions = useMemo<OfficeActions>(
    () => ({
      select: setSelectedId,
      decide: (approvalId, decision) =>
        void run(`approval:${approvalId}`, async () => {
          await api.decideApproval(approvalId, decision);
          await store.refresh();
        }),
      stopTask: (taskId) =>
        void run(`stop:${taskId}`, async () => {
          await api.stopTask(taskId);
          await store.refresh();
        }),
      assign: (agentId, prompt) =>
        run(`assign:${agentId}`, async () => {
          const text = prompt.trim();
          const title = deriveTaskTitle(text);
          // Only the request itself: every setting follows the agent on the server.
          await api.createTask({ title, prompt: text, agentId, kind: 'task' });
          push({ tone: 'success', title: '仕事を依頼しました', body: title, agentId });
          await store.refresh();
        }),
      openTaskModal,
      openAgentModal: (agentId) => setModal({ type: 'agent', agentId }),
      deleteAgent: (agentId) =>
        void run(`delete:${agentId}`, async () => {
          await api.deleteAgent(agentId);
          setSelectedId(null);
          push({ tone: 'success', title: '社員を削除しました' });
          await store.refresh();
        }),
      openInFinder: (path) => openPath('finder', path),
      openInTerminal: (path) => openPath('terminal', path),
      runDemo: (kind) =>
        void run('demo', async () => {
          const { startedTaskIds } = await api.runDemo(kind);
          push(
            kind === 'stop_all'
              ? { tone: 'success', title: 'すべての仕事に停止を指示しました' }
              : { tone: 'success', title: `デモの仕事を${startedTaskIds.length}件依頼しました` },
          );
          await store.refresh();
        }),
      isBusy: (key) => busy.has(key),
    }),
    // `openPath` only closes over stable values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, busy, openTaskModal, push, run, store],
  );

  const pickDirectory = (current: string) =>
    bridge.pickWorkspaceDirectory(current || undefined);

  const editing =
    modal?.type === 'agent'
      ? snapshot?.agents.find((agent) => agent.id === modal.agentId)
      : undefined;

  return (
    <div className="app" data-mode={mode} data-native={bridge.isNative}>
      {mode === 'mini' ? (
        <MiniOfficeHud
          snapshot={snapshot}
          connection={connection}
          error={state.error}
          selectedId={selectedId}
          theme={theme}
          native={bridge.isNative}
          pinned={pinned}
          actions={actions}
          onTogglePin={togglePin}
          onExpand={() => changeMode('full')}
          onRetry={refresh}
        />
      ) : (
        <>
          <TitleBar
            health={snapshot?.health ?? null}
            pendingApprovals={pendingCount ?? 0}
            ready={snapshot !== null}
            demoBusy={busy.has('demo')}
            pinned={pinned}
            theme={preference}
            onShowApprovals={() => {
              const next = snapshot ? getPendingApprovals(snapshot.approvals)[0] : undefined;
              setSelectedId(next?.agentId ?? null);
            }}
            onDemo={() => actions.runDemo('kickoff')}
            onNewTask={() => openTaskModal()}
            onNewAgent={() => actions.openAgentModal()}
            onTogglePin={togglePin}
            onMini={() => changeMode('mini')}
            onThemeChange={setPreference}
          />
          <div className="workspace">
            <Sidebar
              snapshot={snapshot}
              selectedId={selectedId}
              tab={tab}
              onTabChange={setTab}
              actions={actions}
            />
            <CenterStage
              snapshot={snapshot}
              connection={connection}
              error={state.error}
              selectedId={selectedId}
              theme={theme}
              onSelect={setSelectedId}
              onRetry={refresh}
            />
            <AgentInspector
              snapshot={snapshot}
              agent={selected}
              logs={(selectedId ? state.logs[selectedId] : undefined) ?? NO_LOGS}
              actions={actions}
            />
          </div>
        </>
      )}

      {mode === 'full' && snapshot && modal?.type === 'task' && (
        <TaskModal
          snapshot={snapshot}
          agentId={getDefaultTargetAgentId(snapshot.agents, modal.agentId ?? selectedId)}
          canBrowse={bridge.isNative}
          onPickDirectory={pickDirectory}
          onClose={() => setModal(null)}
          onSubmit={async (input) => {
            const task = await api.createTask(input);
            setModal(null);
            setSelectedId(task.agentId);
            push({ tone: 'success', title: '仕事を依頼しました', body: task.title });
            await store.refresh();
          }}
        />
      )}
      {mode === 'full' && snapshot && modal?.type === 'agent' && (!modal.agentId || editing) && (
        <AgentModal
          agent={editing}
          teams={snapshot.teams}
          canBrowse={bridge.isNative}
          onPickDirectory={pickDirectory}
          onClose={() => setModal(null)}
          onSubmit={async (form) => {
            const saved = editing
              ? await api.updateAgent(editing.id, buildUpdateAgentInput(editing, form))
              : await api.createAgent(buildCreateAgentInput(form));
            await store.refresh();
            setModal(null);
            setSelectedId(saved.id);
            push({
              tone: 'success',
              title: editing ? '社員の設定を保存しました' : '社員を追加しました',
              body: saved.displayName,
            });
          }}
        />
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            className="toast"
            data-tone={toast.tone}
            onClick={() => {
              if (toast.agentId) setSelectedId(toast.agentId);
              dismiss(toast.id);
            }}
          >
            <strong>{toast.title}</strong>
            {toast.body && <span>{toast.body}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
