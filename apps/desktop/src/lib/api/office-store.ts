/** Keeps the live office state: REST snapshots plus the SSE stream. */
import { applyEvent } from './apply-event.ts';
import type { EventContext } from './apply-event.ts';
import { createBrowserEventSource } from './event-source.ts';
import type { EventSourceLike } from './event-source.ts';
import type { ApiClient } from './http-client.ts';
import { createLogQueue } from './log-queue.ts';
import { createNotifier } from './notifications.ts';
import type { OfficeNotification } from './notifications.ts';
import { createSseConnection } from './sse-connection.ts';
import { createStateContainer } from './state-container.ts';
import { appendLogs } from './store-state.ts';
import { createCoalescedTask, defaultTimers } from './timers.ts';
import type { Timers } from './timers.ts';

const REFRESH_DEBOUNCE_MS = 150;

export type OfficeStoreOptions = Readonly<{
  api: ApiClient;
  createEventSource?: (url: string) => EventSourceLike;
  onNotify?: (notification: OfficeNotification) => void;
  timers?: Timers;
}>;

export function createOfficeStore({
  api,
  createEventSource = createBrowserEventSource,
  onNotify,
  timers = defaultTimers,
}: OfficeStoreOptions) {
  const container = createStateContainer();
  const { getState, set, applySnapshot } = container;

  async function refresh(): Promise<void> {
    const current = connection.generation();
    try {
      const snapshot = await api.getSnapshot();
      if (current === connection.generation()) applySnapshot(snapshot);
    } catch (error) {
      if (current === connection.generation()) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  function addLogs(incoming: Parameters<typeof appendLogs>[1]) {
    const logs = appendLogs(getState().logs, incoming);
    if (logs) set({ logs });
  }

  const scheduledRefresh = createCoalescedTask(timers, REFRESH_DEBOUNCE_MS, () => void refresh());
  const logQueue = createLogQueue(timers, addLogs);
  const context: EventContext = {
    getSnapshot: () => getState().snapshot,
    setSnapshot: (snapshot) => set({ snapshot }),
    applySnapshot,
    queueLog: logQueue.push,
    notifyOnce: createNotifier(onNotify),
    scheduleRefresh: scheduledRefresh.schedule,
  };
  const connection = createSseConnection({
    api,
    createEventSource,
    timers,
    getConnection: () => getState().connection,
    update: set,
    onEvent: (event) => applyEvent(event, context),
    refresh,
  });

  return {
    getState,
    subscribe: container.subscribe,
    start: connection.start,
    stop() {
      connection.stop();
      scheduledRefresh.cancel();
      logQueue.cancel();
    },
    /** Manual refresh (Cmd+R): reconnects right away when the stream is down. */
    async refresh() {
      if (connection.isRunning() && getState().connection !== 'live') {
        await connection.reconnectNow();
        return;
      }
      await refresh();
    },
    async loadAgentLogs(agentId: string) {
      try {
        addLogs(await api.getAgentLogs(agentId, 300));
      } catch (error) {
        console.error('[office] log history unavailable', error);
      }
    },
  };
}

export type OfficeStore = ReturnType<typeof createOfficeStore>;
