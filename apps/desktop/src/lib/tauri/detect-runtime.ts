export function isTauriRuntime(scope: object | undefined = globalThis.window): boolean {
  return scope !== undefined && '__TAURI_INTERNALS__' in scope;
}
