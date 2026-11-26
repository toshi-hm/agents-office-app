/** EventSource lifecycle: connect, detect silence and reconnect with backoff. */
import type { OfficeSseEvent } from '@agents-office-app/domain';
import { attachEventSource, closeEventSource } from './event-source.ts';
import type { EventSourceLike } from './event-source.ts';
import type { ApiClient } from './http-client.ts';
import { parseSseEvent } from './parse-sse-event.ts';
import {
  SILENCE_TIMEOUT_MS,
  connectionAfterFailure,
  reconnectDelay,
} from './reconnect-policy.ts';
import type { ConnectionState, OfficeState } from './store-state.ts';
import { createDeadline } from './timers.ts';
import type { Timers } from './timers.ts';

export function createSseConnection(options: {
  api: ApiClient;
  createEventSource: (url: string) => EventSourceLike;
  timers: Timers;
  getConnection: () => ConnectionState;
  update: (patch: Partial<OfficeState>) => void;
  onEvent: (event: OfficeSseEvent) => void;
  refresh: () => Promise<void>;
}) {
  const { api, createEventSource, timers, getConnection, update, onEvent, refresh } = options;
  let running = false;
  /** Bumped on every (re)connect and stop so stale async work is ignored. */
  let generation = 0;
  let attempt = 0;
  let source: EventSourceLike | null = null;
  const reconnect = createDeadline(timers);
  const silence = createDeadline(timers);

  function closeSource() {
    silence.cancel();
    if (source) closeEventSource(source);
    source = null;
  }

  function fail(message: string) {
    if (!running) return;
    closeSource();
    api.resetConfig();
    generation += 1;
    attempt += 1;
    update({ connection: connectionAfterFailure(attempt), error: message });
    reconnect.arm(() => void connect(), reconnectDelay(attempt));
  }

  const watchSilence = () =>
    silence.arm(() => fail('バックエンドからの応答が途絶えました'), SILENCE_TIMEOUT_MS);

  async function connect(): Promise<void> {
    if (!running) return;
    closeSource();
    generation += 1;
    const current = generation;
    let next: EventSourceLike;
    try {
      const url = await api.eventsUrl();
      if (current !== generation || !running) return;
      next = createEventSource(url);
    } catch (error) {
      if (current === generation) fail(error instanceof Error ? error.message : String(error));
      return;
    }
    source = next;
    attachEventSource(next, {
      open: () => {
        if (source !== next) return;
        attempt = 0;
        update({ connection: 'live', error: null });
        watchSilence();
        void refresh();
      },
      message: (message) => {
        if (source !== next) return;
        watchSilence();
        attempt = 0;
        if (getConnection() !== 'live') update({ connection: 'live', error: null });
        const event = parseSseEvent(message.data);
        if (event) onEvent(event);
      },
      error: () => {
        if (source === next) fail('バックエンドとの接続が切れました');
      },
    });
    watchSilence();
    // Fetch immediately: it also surfaces readable errors that EventSource hides.
    void refresh();
  }

  return {
    generation: () => generation,
    isRunning: () => running,
    start() {
      if (running) return;
      running = true;
      attempt = 0;
      void connect();
    },
    stop() {
      running = false;
      generation += 1;
      closeSource();
      reconnect.cancel();
    },
    /** Skips the backoff wait, e.g. when the user asks for a refresh. */
    async reconnectNow() {
      reconnect.cancel();
      api.resetConfig();
      await connect();
    },
  };
}
