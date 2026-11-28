import { useCallback } from 'react';
import { ToastStack } from './components/molecules/ToastStack.tsx';
import { OfficeDialogs } from './components/organisms/OfficeDialogs.tsx';
import { FullOfficeLayout } from './components/templates/FullOfficeLayout.tsx';
import { MiniOfficeLayout } from './components/templates/MiniOfficeLayout.tsx';
import { useActionRunner } from './hooks/useActionRunner.ts';
import { useModal } from './hooks/useModal.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { useOffice } from './hooks/useOffice.ts';
import { useOfficeActions } from './hooks/useOfficeActions.ts';
import { useOfficeSelection } from './hooks/useOfficeSelection.ts';
import { useShortcuts } from './hooks/useShortcuts.ts';
import { useTheme } from './hooks/useTheme.ts';
import { useToasts } from './hooks/useToasts.ts';
import { useTraySync } from './hooks/useTraySync.ts';
import { useWindowMode } from './hooks/useWindowMode.ts';
import { runCommand } from './lib/commands.ts';
import { createTauriBridge } from './lib/tauri/create-bridge.ts';
import type { TauriBridge } from './lib/tauri/types.ts';

const defaultBridge = createTauriBridge();

export function App({ bridge = defaultBridge }: { bridge?: TauriBridge }) {
  const { preference, setPreference, theme } = useTheme();
  const { toasts, push, dismiss } = useToasts();
  const notify = useNotifications(bridge, push);
  const { api, store, state } = useOffice(bridge, notify);
  const { snapshot, connection, error } = state;
  const { busy, run, fail } = useActionRunner(push);
  const { modal, openTaskModal, openAgentModal, closeModal } = useModal(snapshot);
  const { mode, pinned, togglePin, changeMode } = useWindowMode({
    bridge,
    run,
    fail,
    closeModal,
  });
  const selection = useOfficeSelection(store, state);
  const { selectedId, setSelectedId: select } = selection;
  const refresh = useCallback(() => void store.refresh(), [store]);

  useShortcuts(bridge, (command) =>
    runCommand(command, {
      mode,
      modalOpen: modal !== null,
      ready: snapshot !== null,
      closeModal,
      clearSelection: () => select(null),
      refresh,
      changeMode,
      openTaskModal: () => openTaskModal(),
    }),
  );
  useTraySync(bridge, snapshot);

  const context = { api, store, bridge, run, push, select };
  const actions = useOfficeActions({ ...context, busy, openTaskModal, openAgentModal });
  const office = { snapshot, connection, error, theme, pinned, actions };

  return (
    <div className="app" data-mode={mode} data-native={bridge.isNative}>
      {mode === 'mini' ? (
        <MiniOfficeLayout
          {...office}
          selectedId={selectedId}
          native={bridge.isNative}
          onTogglePin={togglePin}
          onExpand={() => changeMode('full', closeModal)}
          onRetry={refresh}
        />
      ) : (
        <FullOfficeLayout
          {...office}
          selection={selection}
          themePreference={preference}
          onThemeChange={setPreference}
          onTogglePin={togglePin}
          onMini={() => changeMode('mini', closeModal)}
          onRetry={refresh}
        />
      )}
      {mode === 'full' && snapshot && modal && (
        <OfficeDialogs
          {...context}
          snapshot={snapshot}
          modal={modal}
          selectedId={selectedId}
          close={closeModal}
        />
      )}
      <ToastStack toasts={toasts} onSelectAgent={select} onDismiss={dismiss} />
    </div>
  );
}
