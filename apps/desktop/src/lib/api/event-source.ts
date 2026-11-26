import { EVENT_TYPES } from './parse-sse-event.ts';

export type EventSourceLike = {
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  addEventListener(type: string, listener: (event: { data: unknown }) => void): void;
  close(): void;
};

export const createBrowserEventSource = (url: string) =>
  new EventSource(url) as unknown as EventSourceLike;

export function attachEventSource(
  source: EventSourceLike,
  handlers: Readonly<{
    open: () => void;
    message: (message: { data: unknown }) => void;
    error: () => void;
  }>,
): void {
  source.onopen = handlers.open;
  source.onmessage = handlers.message;
  // Also accept servers that label events (`event: log`); those bypass `onmessage`.
  for (const type of EVENT_TYPES) source.addEventListener(type, handlers.message);
  source.onerror = handlers.error;
}

export function closeEventSource(source: EventSourceLike): void {
  source.onopen = null;
  source.onmessage = null;
  source.onerror = null;
  source.close();
}
