import type { ListenFn } from './types.ts';

/** Turns Tauri's async `listen` into a synchronous subscribe that returns its disposer. */
export function subscribeToEvent(
  listen: ListenFn,
  event: string,
  handler: (payload: unknown) => void,
): () => void {
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
