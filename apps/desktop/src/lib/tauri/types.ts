import type { WindowMode } from '@agents-office-app/domain';

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

/** What the app may ask of its host window, native or browser. */
export type BridgeCommands = {
  getBackendConfig(): Promise<BackendConfig>;
  setWindowMode(mode: WindowMode): Promise<WindowMode>;
  setAlwaysOnTop(enabled: boolean): Promise<boolean>;
  sendNativeNotification(title: string, body: string): Promise<void>;
  /** Resolves false when the host cannot open Finder (browser preview). */
  openPathInFinder(path: string): Promise<boolean>;
  openPathInTerminal(path: string): Promise<boolean>;
  pickWorkspaceDirectory(defaultPath?: string): Promise<string | null>;
  updateTraySummary(runningCount: number, pendingApprovals: number): Promise<void>;
  onWindowModeChanged(handler: (mode: WindowMode) => void): () => void;
  onTrayAction(handler: (action: TrayAction) => void): () => void;
};

export type TauriBridge = BridgeCommands & { isNative: boolean };
