/**
 * The only module that talks to Tauri. Command names and payloads follow
 * docs/architecture/api-contract.md. In a plain browser every call has a safe fallback.
 */
import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { listen as tauriListen } from '@tauri-apps/api/event';
import type { WindowMode } from '@agents-office-app/domain';

export const DEFAULT_BACKEND_URL = 'http://127.0.0.1:4318';

export type TrayAction = 'new-task' | 'toggle-mini' | 'refresh';

export type BackendConfig = Readonly<{ baseUrl: string; token: string }>;

export type InvokeFn = (command: string, args?: Record<string, unknown>) => Promise<unknown>;
export type ListenFn = (
  event: string,
  handler: (event: { payload: unknown }) => void,
) => Promise<() => void>;

export type BridgeDependencies = Readonly<{
  /** The global object probed for the Tauri runtime marker. */
  scope?: object | undefined;
  env?: Readonly<Record<string, unknown>> | undefined;
  invoke?: InvokeFn | undefined;
  listen?: ListenFn | undefined;
}>;

export function isTauriRuntime(scope: object | undefined = globalThis.window): boolean {
  return scope !== undefined && '__TAURI_INTERNALS__' in scope;
}

function readEnv(): Readonly<Record<string, unknown>> {
  return (import.meta.env ?? {}) as unknown as Record<string, unknown>;
}

export function getBrowserBackendConfig(env: Readonly<Record<string, unknown>>): BackendConfig {
  const url = env['VITE_AGENTS_OFFICE_URL'];
  const token = env['VITE_AGENTS_OFFICE_TOKEN'];
  return {
    baseUrl: (typeof url === 'string' && url ? url : DEFAULT_BACKEND_URL).replace(/\/+$/, ''),
    token: typeof token === 'string' ? token : '',
  };
}

const TRAY_ACTIONS: readonly string[] = ['new-task', 'toggle-mini', 'refresh'];

export function createTauriBridge(dependencies: BridgeDependencies = {}) {
  const scope = 'scope' in dependencies ? dependencies.scope : globalThis.window;
  const isNative = isTauriRuntime(scope);
  const invoke: InvokeFn = dependencies.invoke ?? ((command, args) => tauriInvoke(command, args));
  const listen: ListenFn =
    dependencies.listen ?? ((event, handler) => tauriListen(event, handler));
  const env = dependencies.env ?? readEnv();

  function subscribe(event: string, handler: (payload: unknown) => void): () => void {
    if (!isNative) return () => {};
    let disposed = false;
    let unlisten: (() => void) | null = null;
    listen(event, (message) => {
      if (!disposed) handler(message.payload);
    }).then(
      (stop) => {
        // The subscriber may already be gone by the time registration resolves.
        if (disposed) stop();
        else unlisten = stop;
      },
      (error: unknown) => console.error(`[tauri] listen ${event} failed`, error),
    );
    return () => {
      disposed = true;
      unlisten?.();
      unlisten = null;
    };
  }

  return {
    isNative,

    async getBackendConfig(): Promise<BackendConfig> {
      if (!isNative) return getBrowserBackendConfig(env);
      const config = (await invoke('get_backend_config', {})) as BackendConfig;
      if (!config?.baseUrl) throw new Error('バックエンドの接続情報を取得できませんでした');
      return { baseUrl: config.baseUrl.replace(/\/+$/, ''), token: config.token };
    },

    async setWindowMode(mode: WindowMode): Promise<WindowMode> {
      if (!isNative) return mode;
      const result = (await invoke('set_window_mode', { mode })) as { mode: WindowMode };
      return result.mode;
    },

    async setAlwaysOnTop(enabled: boolean): Promise<boolean> {
      if (!isNative) return enabled;
      const result = (await invoke('set_always_on_top', { enabled })) as { enabled: boolean };
      return result.enabled;
    },

    async sendNativeNotification(title: string, body: string): Promise<void> {
      if (isNative) {
        await invoke('send_native_notification', { title, body });
        return;
      }
      const Notifier = globalThis.Notification;
      if (Notifier?.permission === 'granted') new Notifier(title, { body });
    },

    /** Resolves false when the host cannot open Finder (browser preview). */
    async openPathInFinder(path: string): Promise<boolean> {
      if (!isNative) return false;
      await invoke('open_path_in_finder', { path });
      return true;
    },

    async openPathInTerminal(path: string): Promise<boolean> {
      if (!isNative) return false;
      await invoke('open_path_in_terminal', { path });
      return true;
    },

    async pickWorkspaceDirectory(defaultPath?: string): Promise<string | null> {
      if (!isNative) return null;
      const picked = await invoke(
        'pick_workspace_directory',
        defaultPath ? { defaultPath } : {},
      );
      return typeof picked === 'string' && picked ? picked : null;
    },

    async updateTraySummary(runningCount: number, pendingApprovals: number): Promise<void> {
      if (!isNative) return;
      await invoke('update_tray_summary', { runningCount, pendingApprovals });
    },

    onWindowModeChanged(handler: (mode: WindowMode) => void): () => void {
      return subscribe('office:window-mode-changed', (payload) => {
        if (payload === 'full' || payload === 'mini') handler(payload);
      });
    },

    onTrayAction(handler: (action: TrayAction) => void): () => void {
      return subscribe('office:tray-action', (payload) => {
        if (typeof payload === 'string' && TRAY_ACTIONS.includes(payload)) {
          handler(payload as TrayAction);
        }
      });
    },
  };
}

export type TauriBridge = ReturnType<typeof createTauriBridge>;

/** Tauri command errors arrive as plain strings. */
export function describeError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return '不明なエラーが発生しました';
}
