/**
 * Typed REST + SSE client for the Bun backend (docs/architecture/api-contract.md).
 * `createApiClient` is the transport; `createOfficeStore` keeps the live office state.
 */
import type {
  Agent,
  ApprovalDecision,
  ApprovalRequest,
  CreateAgentInput,
  CreateTaskInput,
  ExecutionLog,
  OfficeSnapshot,
  OfficeSseEvent,
  Task,
  UpdateAgentInput,
} from '@agents-office-app/domain';
import type { BackendConfig } from './tauri-bridge.ts';

export type DemoKind = 'kickoff' | 'approval' | 'stop_all';

export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when the backend could not be reached. */
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

function errorMessage(status: number, detail: string): string {
  const base =
    status === 401
      ? 'バックエンドの認証に失敗しました'
      : status === 404
        ? '対象が見つかりません'
        : status === 409
          ? '現在の状態では実行できません（作業中の可能性があります）'
          : status === 400
            ? '入力内容を確認してください'
            : `バックエンドでエラーが発生しました (${status})`;
  return detail ? `${base}: ${detail}` : base;
}

export function createApiClient(
  resolveConfig: () => Promise<BackendConfig>,
  fetchImpl: FetchLike = (url, init) => fetch(url, init),
) {
  let cached: Promise<BackendConfig> | null = null;
  const config = () => {
    cached ??= resolveConfig().catch((error: unknown) => {
      cached = null;
      throw error;
    });
    return cached;
  };

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const { baseUrl, token } = await config();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      cached = null;
      throw new ApiError('バックエンドに接続できません', 0);
    }
    if (!response.ok) {
      if (response.status === 401) cached = null;
      let detail = '';
      try {
        const payload = (await response.json()) as { error?: unknown; message?: unknown };
        const value = payload.error ?? payload.message;
        if (typeof value === 'string') detail = value;
      } catch {
        // Non-JSON error bodies carry nothing useful for the user.
      }
      throw new ApiError(errorMessage(response.status, detail), response.status);
    }
    return (await response.json()) as T;
  }

  const id = encodeURIComponent;

  return {
    /** Forget the resolved address and token (the backend may have restarted). */
    resetConfig() {
      cached = null;
    },
    async eventsUrl(): Promise<string> {
      const { baseUrl, token } = await config();
      return `${baseUrl}/api/events${token ? `?token=${id(token)}` : ''}`;
    },
    getSnapshot: () => request<OfficeSnapshot>('GET', '/api/snapshot'),
    createAgent: async (input: CreateAgentInput) =>
      (await request<{ agent: Agent }>('POST', '/api/agents', input)).agent,
    updateAgent: async (agentId: string, input: UpdateAgentInput) =>
      (await request<{ agent: Agent }>('PATCH', `/api/agents/${id(agentId)}`, input)).agent,
    deleteAgent: async (agentId: string) => {
      await request<{ ok: true }>('DELETE', `/api/agents/${id(agentId)}`);
    },
    createTask: async (input: CreateTaskInput) =>
      (await request<{ task: Task }>('POST', '/api/tasks', input)).task,
    stopTask: async (taskId: string) =>
      (await request<{ task: Task }>('POST', `/api/tasks/${id(taskId)}/stop`)).task,
    getTaskLogs: async (taskId: string, limit = 200) =>
      (await request<{ logs: ExecutionLog[] }>('GET', `/api/tasks/${id(taskId)}/logs?limit=${limit}`))
        .logs,
    getAgentLogs: async (agentId: string, limit = 200) =>
      (
        await request<{ logs: ExecutionLog[] }>(
          'GET',
          `/api/agents/${id(agentId)}/logs?limit=${limit}`,
        )
      ).logs,
    decideApproval: async (approvalId: string, decision: ApprovalDecision) =>
      (
        await request<{ approval: ApprovalRequest }>(
          'POST',
          `/api/approvals/${id(approvalId)}/decide`,
          { decision },
        )
      ).approval,
    runDemo: (kind: DemoKind = 'kickoff') =>
      request<{ ok: true; startedTaskIds: string[] }>('POST', '/api/demo/scenario', { kind }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const LOG_BUFFER_LIMIT = 500;

function compareLogs(left: ExecutionLog, right: ExecutionLog): number {
  if (left.timestamp !== right.timestamp) return left.timestamp < right.timestamp ? -1 : 1;
  return left.id - right.id;
}

/** Merges log lines without duplicates, oldest first, keeping only the newest `limit` lines. */
export function mergeLogs(
  current: readonly ExecutionLog[],
  incoming: readonly ExecutionLog[],
  limit = LOG_BUFFER_LIMIT,
): readonly ExecutionLog[] {
  const key = (log: ExecutionLog) => `${log.executionId}:${log.id}`;
  const seen = new Set(current.map(key));
  const fresh = incoming.filter((log) => {
    if (seen.has(key(log))) return false;
    seen.add(key(log));
    return true;
  });
  if (fresh.length === 0) return current;
  const merged = [...current, ...fresh].sort(compareLogs);
  return merged.length > limit ? merged.slice(merged.length - limit) : merged;
}

const EVENT_TYPES = [
  'snapshot',
  'log',
  'approval_requested',
  'approval_decided',
  'task_finished',
  'heartbeat',
] as const;

export function parseSseEvent(data: unknown): OfficeSseEvent | null {
  if (typeof data !== 'string') return null;
  try {
    const value = JSON.parse(data) as { type?: unknown } | null;
    if (!value || typeof value !== 'object') return null;
    return (EVENT_TYPES as readonly unknown[]).includes(value.type)
      ? (value as OfficeSseEvent)
      : null;
  } catch {
    return null;
  }
}

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'offline';

export type OfficeState = Readonly<{
  connection: ConnectionState;
  snapshot: OfficeSnapshot | null;
  /** Buffered log lines per agent id. */
  logs: Readonly<Record<string, readonly ExecutionLog[]>>;
  error: string | null;
}>;

export type OfficeNotification = Readonly<{
  kind: 'approval' | 'task';
  title: string;
  body: string;
  agentId: string;
  taskId: string;
}>;

export type EventSourceLike = {
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  addEventListener(type: string, listener: (event: { data: unknown }) => void): void;
  close(): void;
};

export type Timers = Readonly<{
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}>;

const defaultTimers: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** The server heartbeats every ~20 s; silence for this long means a dead stream. */
export const SILENCE_TIMEOUT_MS = 65_000;
const REFRESH_DEBOUNCE_MS = 150;
const LOG_FLUSH_MS = 60;
const OFFLINE_AFTER_ATTEMPTS = 4;

export function reconnectDelay(attempt: number): number {
  return Math.min(15_000, 1000 * 2 ** Math.max(0, attempt - 1));
}

export type OfficeStoreOptions = Readonly<{
  api: ApiClient;
  createEventSource?: (url: string) => EventSourceLike;
  onNotify?: (notification: OfficeNotification) => void;
  timers?: Timers;
}>;

function upsert<T extends { id: string }>(items: readonly T[], item: T): readonly T[] {
  const index = items.findIndex((existing) => existing.id === item.id);
  if (index < 0) return [item, ...items];
  return items.map((existing, i) => (i === index ? item : existing));
}

export function createOfficeStore({
  api,
  createEventSource = (url) => new EventSource(url) as unknown as EventSourceLike,
  onNotify,
  timers = defaultTimers,
}: OfficeStoreOptions) {
  let state: OfficeState = { connection: 'connecting', snapshot: null, logs: {}, error: null };
  const listeners = new Set<() => void>();
  const notified = new Set<string>();

  let running = false;
  /** Bumped on every (re)connect and stop so stale async work is ignored. */
  let generation = 0;
  let attempt = 0;
  let source: EventSourceLike | null = null;
  let reconnectTimer: unknown = null;
  let silenceTimer: unknown = null;
  let refreshTimer: unknown = null;
  let flushTimer: unknown = null;
  let pendingLogs: ExecutionLog[] = [];

  function set(patch: Partial<OfficeState>) {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  }

  function applySnapshot(snapshot: OfficeSnapshot) {
    // A slow REST response must not roll the office back behind a newer stream snapshot.
    if (state.snapshot && snapshot.observedAt < state.snapshot.observedAt) return;
    set({ snapshot, error: null });
  }

  async function refresh(): Promise<void> {
    const current = generation;
    try {
      const snapshot = await api.getSnapshot();
      if (current === generation) applySnapshot(snapshot);
    } catch (error) {
      if (current === generation) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  function scheduleRefresh() {
    if (refreshTimer !== null) return;
    refreshTimer = timers.set(() => {
      refreshTimer = null;
      void refresh();
    }, REFRESH_DEBOUNCE_MS);
  }

  function addLogs(incoming: readonly ExecutionLog[]) {
    const byAgent = new Map<string, ExecutionLog[]>();
    for (const log of incoming) {
      const group = byAgent.get(log.agentId);
      if (group) group.push(log);
      else byAgent.set(log.agentId, [log]);
    }
    const logs = { ...state.logs };
    let changed = false;
    for (const [agentId, lines] of byAgent) {
      const before = logs[agentId] ?? [];
      const after = mergeLogs(before, lines);
      if (after !== before) {
        logs[agentId] = after;
        changed = true;
      }
    }
    if (changed) set({ logs });
  }

  function queueLog(log: ExecutionLog) {
    pendingLogs.push(log);
    // Chatty CLIs emit many lines per second; render them in small batches.
    if (flushTimer !== null) return;
    flushTimer = timers.set(() => {
      flushTimer = null;
      const batch = pendingLogs;
      pendingLogs = [];
      addLogs(batch);
    }, LOG_FLUSH_MS);
  }

  function agentName(agentId: string): string {
    return state.snapshot?.agents.find((agent) => agent.id === agentId)?.displayName ?? '社員';
  }

  function notifyOnce(key: string, notification: OfficeNotification) {
    if (notified.has(key)) return;
    notified.add(key);
    onNotify?.(notification);
  }

  function handle(event: OfficeSseEvent) {
    const snapshot = state.snapshot;
    switch (event.type) {
      case 'snapshot':
        applySnapshot(event.snapshot);
        break;
      case 'log':
        queueLog(event.log);
        break;
      case 'approval_requested':
      case 'approval_decided': {
        const { approval } = event;
        // Reflect the decision immediately; the follow-up snapshot settles derived counts.
        if (snapshot) {
          set({ snapshot: { ...snapshot, approvals: upsert(snapshot.approvals, approval) } });
        }
        if (event.type === 'approval_requested' && approval.status === 'pending') {
          notifyOnce(`approval:${approval.id}`, {
            kind: 'approval',
            title: `${agentName(approval.agentId)}が承認を待っています`,
            body: `${approval.toolName}: ${approval.summary}`,
            agentId: approval.agentId,
            taskId: approval.taskId,
          });
        }
        scheduleRefresh();
        break;
      }
      case 'task_finished': {
        const { task } = event;
        if (snapshot) set({ snapshot: { ...snapshot, tasks: upsert(snapshot.tasks, task) } });
        const outcome =
          task.status === 'succeeded' ? '完了' : task.status === 'failed' ? '失敗' : '停止';
        notifyOnce(`task:${task.id}:${task.completedAt ?? task.updatedAt}`, {
          kind: 'task',
          title: `${agentName(task.agentId)}の仕事が${outcome}しました`,
          body: task.title,
          agentId: task.agentId,
          taskId: task.id,
        });
        scheduleRefresh();
        break;
      }
      case 'heartbeat':
        break;
    }
  }

  function closeSource() {
    if (silenceTimer !== null) timers.clear(silenceTimer);
    silenceTimer = null;
    if (source) {
      source.onopen = null;
      source.onmessage = null;
      source.onerror = null;
      source.close();
      source = null;
    }
  }

  function fail(message: string) {
    if (!running) return;
    closeSource();
    api.resetConfig();
    generation += 1;
    attempt += 1;
    set({
      connection: attempt >= OFFLINE_AFTER_ATTEMPTS ? 'offline' : 'reconnecting',
      error: message,
    });
    if (reconnectTimer !== null) timers.clear(reconnectTimer);
    reconnectTimer = timers.set(() => {
      reconnectTimer = null;
      void connect();
    }, reconnectDelay(attempt));
  }

  function watchSilence() {
    if (silenceTimer !== null) timers.clear(silenceTimer);
    silenceTimer = timers.set(() => {
      silenceTimer = null;
      fail('バックエンドからの応答が途絶えました');
    }, SILENCE_TIMEOUT_MS);
  }

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
      if (current === generation) {
        fail(error instanceof Error ? error.message : String(error));
      }
      return;
    }
    source = next;
    const receive = (message: { data: unknown }) => {
      if (source !== next) return;
      watchSilence();
      attempt = 0;
      if (state.connection !== 'live') set({ connection: 'live', error: null });
      const event = parseSseEvent(message.data);
      if (event) handle(event);
    };
    next.onopen = () => {
      if (source !== next) return;
      attempt = 0;
      set({ connection: 'live', error: null });
      watchSilence();
      void refresh();
    };
    next.onmessage = receive;
    // Also accept servers that label events (`event: log`); those bypass `onmessage`.
    for (const type of EVENT_TYPES) next.addEventListener(type, receive);
    next.onerror = () => {
      if (source === next) fail('バックエンドとの接続が切れました');
    };
    watchSilence();
    // Fetch immediately: it also surfaces readable errors that EventSource hides.
    void refresh();
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
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
      for (const timer of [reconnectTimer, refreshTimer, flushTimer]) {
        if (timer !== null) timers.clear(timer);
      }
      reconnectTimer = null;
      refreshTimer = null;
      flushTimer = null;
      pendingLogs = [];
    },
    /** Manual refresh (Cmd+R): reconnects right away when the stream is down. */
    async refresh() {
      if (running && state.connection !== 'live') {
        if (reconnectTimer !== null) timers.clear(reconnectTimer);
        reconnectTimer = null;
        api.resetConfig();
        await connect();
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
