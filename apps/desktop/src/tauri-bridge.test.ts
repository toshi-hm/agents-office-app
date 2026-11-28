import { describe, expect, test } from 'bun:test';
import {
  createTauriBridge,
  getBrowserBackendConfig,
  isTauriRuntime,
} from './lib/tauri-bridge.ts';

function nativeBridge() {
  const calls: [string, unknown][] = [];
  const handlers = new Map<string, (event: { payload: unknown }) => void>();
  const stopped: string[] = [];
  const bridge = createTauriBridge({
    scope: { __TAURI_INTERNALS__: {} },
    invoke: async (command, args) => {
      calls.push([command, args]);
      if (command === 'get_backend_config') {
        return { baseUrl: 'http://127.0.0.1:5000/', token: 't', platform: 'macos' };
      }
      if (command === 'set_window_mode') return { mode: args?.['mode'] };
      if (command === 'set_always_on_top') return { enabled: args?.['enabled'] };
      if (command === 'pick_workspace_directory') return '/picked';
      return undefined;
    },
    listen: async (event, handler) => {
      handlers.set(event, handler);
      return () => stopped.push(event);
    },
  });
  return { bridge, calls, handlers, stopped };
}

describe('runtime detection', () => {
  test('looks for the Tauri v2 marker', () => {
    expect(isTauriRuntime({ __TAURI_INTERNALS__: {} })).toBe(true);
    expect(isTauriRuntime({})).toBe(false);
    expect(isTauriRuntime(undefined)).toBe(false);
  });
});

describe('native bridge', () => {
  test('calls the contract commands with their exact payloads', async () => {
    const { bridge, calls } = nativeBridge();
    expect(await bridge.getBackendConfig()).toEqual({
      baseUrl: 'http://127.0.0.1:5000',
      token: 't',
    });
    expect(await bridge.setWindowMode('mini')).toBe('mini');
    expect(await bridge.setAlwaysOnTop(true)).toBe(true);
    await bridge.sendNativeNotification('題', '本文');
    expect(await bridge.openPathInFinder('/a')).toBe(true);
    expect(await bridge.openPathInTerminal('/b')).toBe(true);
    expect(await bridge.pickWorkspaceDirectory('/c')).toBe('/picked');
    await bridge.pickWorkspaceDirectory();
    await bridge.updateTraySummary(2, 1);
    expect(calls).toEqual([
      ['get_backend_config', {}],
      ['set_window_mode', { mode: 'mini' }],
      ['set_always_on_top', { enabled: true }],
      ['send_native_notification', { title: '題', body: '本文' }],
      ['open_path_in_finder', { path: '/a' }],
      ['open_path_in_terminal', { path: '/b' }],
      ['pick_workspace_directory', { defaultPath: '/c' }],
      ['pick_workspace_directory', {}],
      ['update_tray_summary', { runningCount: 2, pendingApprovals: 1 }],
    ]);
  });

  test('forwards only valid shell events', async () => {
    const { bridge, handlers } = nativeBridge();
    const seen: string[] = [];
    bridge.onWindowModeChanged((mode) => seen.push(mode));
    bridge.onTrayAction((action) => seen.push(action));
    await Promise.resolve();
    handlers.get('office:window-mode-changed')!({ payload: 'mini' });
    handlers.get('office:window-mode-changed')!({ payload: 'huge' });
    handlers.get('office:tray-action')!({ payload: 'new-task' });
    handlers.get('office:tray-action')!({ payload: 'quit' });
    expect(seen).toEqual(['mini', 'new-task']);
  });

  test('unlistens even when disposed before registration resolves', async () => {
    const { bridge, handlers, stopped } = nativeBridge();
    const seen: string[] = [];
    const dispose = bridge.onTrayAction((action) => seen.push(action));
    dispose();
    await new Promise((resolve) => setTimeout(resolve, 0));
    handlers.get('office:tray-action')!({ payload: 'refresh' });
    expect(stopped).toEqual(['office:tray-action']);
    expect(seen).toEqual([]);
  });
});

describe('browser fallback', () => {
  const bridge = createTauriBridge({
    scope: {},
    env: {},
    invoke: async () => {
      throw new Error('must not be called');
    },
  });

  test('uses the default backend address', async () => {
    expect(await bridge.getBackendConfig()).toEqual({
      baseUrl: 'http://127.0.0.1:4318',
      token: '',
    });
  });

  test('honours the Vite environment', () => {
    expect(
      getBrowserBackendConfig({
        VITE_AGENTS_OFFICE_URL: 'http://127.0.0.1:9999/',
        VITE_AGENTS_OFFICE_TOKEN: 'dev',
      }),
    ).toEqual({ baseUrl: 'http://127.0.0.1:9999', token: 'dev' });
  });

  test('never invokes native commands', async () => {
    expect(bridge.isNative).toBe(false);
    expect(await bridge.setWindowMode('mini')).toBe('mini');
    expect(await bridge.setAlwaysOnTop(true)).toBe(true);
    expect(await bridge.openPathInFinder('/a')).toBe(false);
    expect(await bridge.openPathInTerminal('/a')).toBe(false);
    expect(await bridge.pickWorkspaceDirectory()).toBeNull();
    await bridge.updateTraySummary(1, 1);
    await bridge.sendNativeNotification('a', 'b');
    bridge.onTrayAction(() => {})();
  });
});
