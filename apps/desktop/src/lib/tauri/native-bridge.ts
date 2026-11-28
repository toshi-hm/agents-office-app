/** Command names and payloads follow docs/architecture/api-contract.md. */
import type { WindowMode } from '@agents-office-app/domain';
import { subscribeToEvent } from './subscribe.ts';
import type { BackendConfig, BridgeCommands, InvokeFn, ListenFn, TrayAction } from './types.ts';

const TRAY_ACTIONS: readonly string[] = ['new-task', 'toggle-mini', 'refresh'];

export function createNativeBridge(invoke: InvokeFn, listen: ListenFn): BridgeCommands {
  return {
    async getBackendConfig() {
      const config = (await invoke('get_backend_config', {})) as BackendConfig;
      if (!config?.baseUrl) throw new Error('バックエンドの接続情報を取得できませんでした');
      return { baseUrl: config.baseUrl.replace(/\/+$/, ''), token: config.token };
    },

    async setWindowMode(mode) {
      const result = (await invoke('set_window_mode', { mode })) as { mode: WindowMode };
      return result.mode;
    },

    async setAlwaysOnTop(enabled) {
      const result = (await invoke('set_always_on_top', { enabled })) as { enabled: boolean };
      return result.enabled;
    },

    async sendNativeNotification(title, body) {
      await invoke('send_native_notification', { title, body });
    },

    async openPathInFinder(path) {
      await invoke('open_path_in_finder', { path });
      return true;
    },

    async openPathInTerminal(path) {
      await invoke('open_path_in_terminal', { path });
      return true;
    },

    async pickWorkspaceDirectory(defaultPath) {
      const picked = await invoke(
        'pick_workspace_directory',
        defaultPath ? { defaultPath } : {},
      );
      return typeof picked === 'string' && picked ? picked : null;
    },

    async updateTraySummary(runningCount, pendingApprovals) {
      await invoke('update_tray_summary', { runningCount, pendingApprovals });
    },

    onWindowModeChanged(handler) {
      return subscribeToEvent(listen, 'office:window-mode-changed', (payload) => {
        if (payload === 'full' || payload === 'mini') handler(payload);
      });
    },

    onTrayAction(handler) {
      return subscribeToEvent(listen, 'office:tray-action', (payload) => {
        if (typeof payload === 'string' && TRAY_ACTIONS.includes(payload)) {
          handler(payload as TrayAction);
        }
      });
    },
  };
}
