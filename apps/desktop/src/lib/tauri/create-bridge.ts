/**
 * `lib/tauri` is the only place that talks to Tauri. It picks the native or browser implementation
 * once, from the runtime marker.
 */
import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { listen as tauriListen } from '@tauri-apps/api/event';
import { createBrowserBridge } from './browser-bridge.ts';
import { isTauriRuntime } from './detect-runtime.ts';
import { createNativeBridge } from './native-bridge.ts';
import type { BridgeDependencies, InvokeFn, ListenFn, TauriBridge } from './types.ts';

function readEnv(): Readonly<Record<string, unknown>> {
  return (import.meta.env ?? {}) as unknown as Record<string, unknown>;
}

export function createTauriBridge(dependencies: BridgeDependencies = {}): TauriBridge {
  const scope = 'scope' in dependencies ? dependencies.scope : globalThis.window;
  const isNative = isTauriRuntime(scope);
  const invoke: InvokeFn = dependencies.invoke ?? ((command, args) => tauriInvoke(command, args));
  const listen: ListenFn =
    dependencies.listen ?? ((event, handler) => tauriListen(event, handler));
  const env = dependencies.env ?? readEnv();
  const commands = isNative ? createNativeBridge(invoke, listen) : createBrowserBridge(env);
  return { isNative, ...commands };
}
