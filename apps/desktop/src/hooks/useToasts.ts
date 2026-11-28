import { useCallback, useEffect, useRef, useState } from 'react';

export type Toast = Readonly<{
  id: number;
  tone: 'info' | 'success' | 'warning' | 'error';
  title: string;
  body?: string | undefined;
  /** Selecting the toast focuses this agent. */
  agentId?: string | undefined;
}>;

export type PushToast = (toast: Omit<Toast, 'id'>) => void;

const LIFETIME_MS = 5200;
const MAX_TOASTS = 4;

export function useToasts() {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Set<number>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const push = useCallback<PushToast>(
    (toast) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...toast, id }].slice(-MAX_TOASTS));
      const timer = window.setTimeout(() => {
        timers.current.delete(timer);
        dismiss(id);
      }, LIFETIME_MS);
      timers.current.add(timer);
    },
    [dismiss],
  );
  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer);
    },
    [],
  );
  return { toasts, push, dismiss };
}
