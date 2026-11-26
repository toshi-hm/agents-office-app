import { describe, expect, test } from 'bun:test';
import {
  ApiError,
  SILENCE_TIMEOUT_MS,
  createApiClient,
  createOfficeStore,
  mergeLogs,
  parseSseEvent,
  reconnectDelay,
} from './lib/api-client.ts';
import type { EventSourceLike, OfficeNotification, Timers } from './lib/api-client.ts';
import { approval, log, snapshot, task } from './test-fixtures.ts';

type Call = { url: string; init: RequestInit | undefined };

function fakeBackend(respond: (path: string, call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  let resolved = 0;
  const api = createApiClient(
    async () => {
      resolved += 1;
      return { baseUrl: 'http://127.0.0.1:4318', token: 'se cret' };
    },
    async (url, init) => {
      const call = { url, init };
      calls.push(call);
      return respond(new URL(url).pathname, call);
    },
  );
  return { api, calls, resolvedCount: () => resolved };
}

describe('createApiClient', () => {
  test('sends the bearer token and JSON bodies to the contract endpoints', async () => {
    const { api, calls } = fakeBackend(() =>
      Response.json({
        agent: {},
        task: {},
        approval: {},
        logs: [],
        ok: true,
        startedTaskIds: [],
      }),
    );
    await api.createAgent({ displayName: 'A', role: 'employee', teamId: 'dev', provider: 'demo' });
    await api.updateAgent('a/1', { displayName: 'B' });
    await api.deleteAgent('a1');
    await api.createTask({ title: 't', prompt: 'p', agentId: 'a1' });
    await api.stopTask('t1');
    await api.getTaskLogs('t1');
    await api.getAgentLogs('a1', 50);
    await api.decideApproval('ap1', 'deny');
    await api.runDemo('approval');
    await api.getSnapshot();

    expect(calls.map((c) => `${c.init?.method} ${c.url.replace('http://127.0.0.1:4318', '')}`)).toEqual(
      [
        'POST /api/agents',
        'PATCH /api/agents/a%2F1',
        'DELETE /api/agents/a1',
        'POST /api/tasks',
        'POST /api/tasks/t1/stop',
        'GET /api/tasks/t1/logs?limit=200',
        'GET /api/agents/a1/logs?limit=50',
        'POST /api/approvals/ap1/decide',
        'POST /api/demo/scenario',
        'GET /api/snapshot',
      ],
    );
    for (const call of calls) {
      expect((call.init?.headers as Record<string, string>)['Authorization']).toBe('Bearer se cret');
    }
    expect(calls[7]!.init?.body).toBe('{"decision":"deny"}');
    expect(calls[8]!.init?.body).toBe('{"kind":"approval"}');
    // Bodyless requests must not claim to carry JSON.
    expect(calls[4]!.init?.body).toBeUndefined();
    expect(calls[4]!.init?.headers).not.toHaveProperty('Content-Type');
  });

  test('puts the encoded token in the event stream URL', async () => {
    const { api } = fakeBackend(() => Response.json({}));
    expect(await api.eventsUrl()).toBe('http://127.0.0.1:4318/api/events?token=se%20cret');
  });

  test('omits authentication when there is no token', async () => {
    const api = createApiClient(async () => ({ baseUrl: 'http://x', token: '' }));
    expect(await api.eventsUrl()).toBe('http://x/api/events');
  });

  test('turns failures into readable errors', async () => {
    const { api } = fakeBackend(() => Response.json({ error: 'busy' }, { status: 409 }));
    const failure = await api.deleteAgent('a1').catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(409);
    expect((failure as ApiError).message).toContain('作業中');
    expect((failure as ApiError).message).toContain('busy');
  });

  test('reports an unreachable backend and re-resolves its address', async () => {
    const backend = fakeBackend(() => {
      throw new TypeError('fetch failed');
    });
    const failure = await backend.api.getSnapshot().catch((error: unknown) => error);
    expect((failure as ApiError).status).toBe(0);
    await backend.api.getSnapshot().catch(() => {});
    expect(backend.resolvedCount()).toBe(2);
  });

  test('retries configuration after it fails', async () => {
    let attempts = 0;
    const api = createApiClient(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('not ready');
      return { baseUrl: 'http://x', token: '' };
    });
    await expect(api.eventsUrl()).rejects.toThrow('not ready');
    expect(await api.eventsUrl()).toBe('http://x/api/events');
  });
});

describe('log buffering', () => {
  test('deduplicates, orders and caps lines', () => {
    const first = mergeLogs([], [log(3), log(1)]);
    const merged = mergeLogs(first, [log(2), log(3)]);
    expect(merged.map((l) => l.id)).toEqual([1, 2, 3]);
    expect(mergeLogs(merged, [log(4)], 2).map((l) => l.id)).toEqual([3, 4]);
  });

  test('keeps identity when nothing is new', () => {
    const current = mergeLogs([], [log(1)]);
    expect(mergeLogs(current, [log(1)])).toBe(current);
  });
});

describe('parseSseEvent', () => {
  test('accepts contract events only', () => {
    expect(parseSseEvent('{"type":"heartbeat","timestamp":"x"}')?.type).toBe('heartbeat');
    for (const bad of ['nope', '{"type":"other"}', 'null', 42, undefined]) {
      expect(parseSseEvent(bad)).toBeNull();
    }
  });
});

class FakeSource implements EventSourceLike {
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  readonly named = new Map<string, (event: { data: unknown }) => void>();
  closed = false;
  constructor(readonly url: string) {}
  addEventListener(type: string, listener: (event: { data: unknown }) => void) {
    this.named.set(type, listener);
  }
  close() {
    this.closed = true;
  }
  emit(event: unknown) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }
}

function fakeTimers() {
  let nextId = 1;
  const pending = new Map<number, { callback: () => void; ms: number }>();
  const timers: Timers = {
    set: (callback, ms) => {
      const id = nextId++;
      pending.set(id, { callback, ms });
      return id;
    },
    clear: (handle) => {
      pending.delete(handle as number);
    },
  };
  return {
    timers,
    pending,
    fire(ms: number) {
      const due = [...pending].filter(([, timer]) => timer.ms === ms);
      for (const [id, timer] of due) {
        pending.delete(id);
        timer.callback();
      }
      return due.length;
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

async function startStore(respond?: (path: string) => Response) {
  const backend = fakeBackend((path) => {
    if (respond) return respond(path);
    if (path === '/api/snapshot') return Response.json(snapshot());
    return Response.json({ logs: [log(2), log(1)] });
  });
  const clock = fakeTimers();
  const sources: FakeSource[] = [];
  const notifications: OfficeNotification[] = [];
  const store = createOfficeStore({
    api: backend.api,
    createEventSource: (url) => {
      const source = new FakeSource(url);
      sources.push(source);
      return source;
    },
    onNotify: (notification) => notifications.push(notification),
    timers: clock.timers,
  });
  store.start();
  await settle();
  return { store, sources, notifications, clock, backend };
}

describe('createOfficeStore', () => {
  test('loads the snapshot and goes live when the stream opens', async () => {
    const { store, sources } = await startStore();
    expect(store.getState().snapshot?.agents).toHaveLength(2);
    expect(store.getState().connection).toBe('connecting');
    sources[0]!.onopen?.({});
    expect(store.getState().connection).toBe('live');
    store.stop();
    expect(sources[0]!.closed).toBe(true);
  });

  test('applies newer snapshots and ignores stale ones', async () => {
    const { store, sources } = await startStore();
    const newer = snapshot({ observedAt: '2026-11-26T11:00:00.000Z', agents: [] });
    sources[0]!.emit({ type: 'snapshot', snapshot: newer });
    expect(store.getState().snapshot?.agents).toHaveLength(0);
    await store.refresh();
    expect(store.getState().snapshot?.observedAt).toBe(newer.observedAt);
    store.stop();
  });

  test('also understands named server events', async () => {
    const { store, sources } = await startStore();
    const newer = snapshot({ observedAt: '2026-11-26T11:00:00.000Z', agents: [] });
    sources[0]!.named.get('snapshot')!({
      data: JSON.stringify({ type: 'snapshot', snapshot: newer }),
    });
    expect(store.getState().snapshot?.agents).toHaveLength(0);
    store.stop();
  });

  test('batches live logs per agent', async () => {
    const { store, sources, clock } = await startStore();
    sources[0]!.emit({ type: 'log', log: log(1) });
    sources[0]!.emit({ type: 'log', log: log(2, { agentId: 'p1' }) });
    sources[0]!.emit({ type: 'log', log: log(3) });
    expect(store.getState().logs).toEqual({});
    expect(clock.fire(60)).toBe(1);
    expect(store.getState().logs['a1']?.map((l) => l.id)).toEqual([1, 3]);
    expect(store.getState().logs['p1']?.map((l) => l.id)).toEqual([2]);
    await store.loadAgentLogs('a1');
    expect(store.getState().logs['a1']?.map((l) => l.id)).toEqual([1, 2, 3]);
    store.stop();
  });

  test('notifies once per new approval and finished task', async () => {
    const { store, sources, notifications, clock, backend } = await startStore();
    const request = approval('ap1');
    sources[0]!.emit({ type: 'approval_requested', approval: request });
    sources[0]!.emit({ type: 'approval_requested', approval: request });
    expect(store.getState().snapshot?.approvals).toEqual([request]);
    const finished = task('t1', { status: 'failed', completedAt: '2026-11-26T10:01:00.000Z' });
    sources[0]!.emit({ type: 'task_finished', task: finished });
    sources[0]!.emit({ type: 'task_finished', task: finished });
    expect(notifications.map((n) => n.kind)).toEqual(['approval', 'task']);
    expect(notifications[0]!.title).toBe('社員a1が承認を待っています');
    expect(notifications[1]!.title).toContain('失敗');

    // Several events share one follow-up snapshot request.
    const before = backend.calls.length;
    expect(clock.fire(150)).toBe(1);
    await settle();
    expect(backend.calls.length).toBe(before + 1);
    store.stop();
  });

  test('does not notify for decisions or already decided requests', async () => {
    const { store, sources, notifications } = await startStore();
    const decided = approval('ap2', { status: 'approved', decision: 'allow' });
    sources[0]!.emit({ type: 'approval_decided', approval: decided });
    sources[0]!.emit({ type: 'approval_requested', approval: decided });
    expect(notifications).toHaveLength(0);
    store.stop();
  });

  test('reconnects with backoff and eventually reports offline', async () => {
    const { store, sources, clock } = await startStore();
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      sources.at(-1)!.onerror?.({});
      expect(sources.at(-1)!.closed).toBe(true);
      expect(store.getState().connection).toBe(attempt < 4 ? 'reconnecting' : 'offline');
      expect(clock.fire(reconnectDelay(attempt))).toBe(1);
      await settle();
    }
    expect(sources).toHaveLength(5);
    sources.at(-1)!.onopen?.({});
    expect(store.getState().connection).toBe('live');
    expect(store.getState().error).toBeNull();
    store.stop();
  });

  test('replaces a silent stream', async () => {
    const { store, sources, clock } = await startStore();
    sources[0]!.onopen?.({});
    expect(clock.fire(SILENCE_TIMEOUT_MS)).toBe(1);
    expect(sources[0]!.closed).toBe(true);
    expect(store.getState().connection).toBe('reconnecting');
    store.stop();
  });

  test('a manual refresh reconnects immediately when disconnected', async () => {
    const { store, sources } = await startStore();
    sources[0]!.onerror?.({});
    await store.refresh();
    expect(sources).toHaveLength(2);
    store.stop();
  });

  test('keeps the error message when the snapshot cannot be read', async () => {
    const { store } = await startStore(() => Response.json({}, { status: 401 }));
    expect(store.getState().error).toContain('認証');
    store.stop();
  });

  test('stop cancels every timer and ignores later events', async () => {
    const { store, sources, clock } = await startStore();
    sources[0]!.emit({ type: 'log', log: log(1) });
    sources[0]!.emit({ type: 'task_finished', task: task('t9', { status: 'succeeded' }) });
    store.stop();
    expect(clock.pending.size).toBe(0);
    expect(sources[0]!.onmessage).toBeNull();
  });

  test('can restart after stop (React StrictMode)', async () => {
    const { store, sources } = await startStore();
    store.stop();
    store.start();
    await settle();
    expect(sources.at(-1)!.closed).toBe(false);
    store.stop();
  });

  test('caps the reconnect delay', () => {
    expect([1, 2, 3, 4, 5, 20].map(reconnectDelay)).toEqual([
      1000, 2000, 4000, 8000, 15000, 15000,
    ]);
  });
});
