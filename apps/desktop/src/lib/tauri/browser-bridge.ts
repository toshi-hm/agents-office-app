/** In a plain browser every call has a safe fallback. */
import type { BackendConfig, BridgeCommands } from './types.ts';

export const DEFAULT_BACKEND_URL = 'http://127.0.0.1:4318';

export function getBrowserBackendConfig(env: Readonly<Record<string, unknown>>): BackendConfig {
  const url = env['VITE_AGENTS_OFFICE_URL'];
  const token = env['VITE_AGENTS_OFFICE_TOKEN'];
  return {
    baseUrl: (typeof url === 'string' && url ? url : DEFAULT_BACKEND_URL).replace(/\/+$/, ''),
    token: typeof token === 'string' ? token : '',
  };
}

export function createBrowserBridge(env: Readonly<Record<string, unknown>>): BridgeCommands {
  return {
    getBackendConfig: async () => getBrowserBackendConfig(env),
    setWindowMode: async (mode) => mode,
    setAlwaysOnTop: async (enabled) => enabled,
    async sendNativeNotification(title, body) {
      const Notifier = globalThis.Notification;
      if (Notifier?.permission === 'granted') new Notifier(title, { body });
    },
    openPathInFinder: async () => false,
    openPathInTerminal: async () => false,
    pickWorkspaceDirectory: async () => null,
    updateTraySummary: async () => {},
    onWindowModeChanged: () => () => {},
    onTrayAction: () => () => {},
  };
}
