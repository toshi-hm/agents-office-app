import type { ConnectionState } from './store-state.ts';

/** The server heartbeats every ~20 s; silence for this long means a dead stream. */
export const SILENCE_TIMEOUT_MS = 65_000;
const OFFLINE_AFTER_ATTEMPTS = 4;

export function reconnectDelay(attempt: number): number {
  return Math.min(15_000, 1000 * 2 ** Math.max(0, attempt - 1));
}

export function connectionAfterFailure(attempt: number): ConnectionState {
  return attempt >= OFFLINE_AFTER_ATTEMPTS ? 'offline' : 'reconnecting';
}
