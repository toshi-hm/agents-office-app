import { useCallback, useRef, useState } from 'react';
import { describeError } from '../lib/tauri/describe-error.ts';
import type { PushToast } from './useToasts.ts';

export type RunAction = (key: string, action: () => Promise<void>) => Promise<boolean>;

/** Guards user actions against double submission and reports their failures as toasts. */
export function useActionRunner(push: PushToast) {
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const busyKeys = useRef(new Set<string>());

  const fail = useCallback(
    (error: unknown) => push({ tone: 'error', title: describeError(error) }),
    [push],
  );

  /** Runs one user action at a time per key; resolves false after reporting a failure. */
  const run = useCallback<RunAction>(
    async (key, action) => {
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

  return { busy, run, fail };
}
