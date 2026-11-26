import type {
  ApprovalDecision, CreateAgentInput, CreateTaskInput, OfficeSseEvent, UpdateAgentInput,
} from '@agents-office-app/domain';
import { OfficeError, now, openOfficeDb } from './db.ts';
import { createProcessObserver, type ObserverOptions } from './observer.ts';
import { createRunner } from './runner.ts';

type Body = Record<string, unknown>;
type Rule = (value: unknown) => boolean;
const nonEmpty: Rule = (value) => typeof value === 'string' && value.trim().length > 0 && !value.includes('\0');
const text: Rule = (value) => typeof value === 'string' && !value.includes('\0');
const oneOf = (...values: string[]): Rule => (value) => typeof value === 'string' && values.includes(value);
const settings = {
  provider: oneOf('claude', 'codex', 'agy', 'demo'),
  model: text,
  effort: oneOf('low', 'medium', 'high', 'xhigh'),
  workspacePath: nonEmpty,
};
const agentFields = {
  displayName: nonEmpty,
  role: oneOf('president', 'dept_manager', 'employee'),
  teamId: nonEmpty,
  avatarColor: (value: unknown) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value),
  ...settings,
};
const taskFields = {
  title: nonEmpty, prompt: nonEmpty, agentId: nonEmpty, kind: oneOf('task', 'consultation', 'proposal'), ...settings,
};

async function body<T>(request: Request, fields: Record<string, Rule>, required: string[] = [], optional = false) {
  const raw = await request.text();
  let parsed: unknown;
  try {
    parsed = optional && raw.trim() === '' ? {} : JSON.parse(raw);
  } catch {
    throw new OfficeError(400, 'Invalid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new OfficeError(400, 'Expected a JSON object');
  }
  const input = parsed as Body;
  for (const name of required) {
    if (!Object.hasOwn(input, name)) throw new OfficeError(400, 'Missing field: ' + name);
  }
  for (const [name, value] of Object.entries(input)) {
    if (!Object.hasOwn(fields, name) || !fields[name]!(value)) {
      throw new OfficeError(400, 'Invalid field: ' + name);
    }
  }
  return input as T;
}

const allowedOrigin = /^(?:http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?|tauri:\/\/localhost|http:\/\/tauri\.localhost)$/;
const encoder = new TextEncoder();
const eventData = (event: OfficeSseEvent) => encoder.encode('data: ' + JSON.stringify(event) + '\n\n');

export type OfficeServerOptions = {
  token: string;
  port?: number;
  dbPath?: string;
  demoStepMs?: number;
  heartbeatMs?: number;
  observer?: Pick<ObserverOptions, 'intervalMs' | 'readProcesses'>;
};

export function createOfficeServer(options: OfficeServerOptions) {
  if (!options.token) throw new Error('A non-empty bearer token is required');
  const db = openOfficeDb(options.dbPath);
  const subscribers = new Set<ReadableStreamDefaultController<Uint8Array>>();
  let closing: Promise<void> | undefined;

  function publish(event: OfficeSseEvent) {
    if (!subscribers.size) return;
    const data = eventData(event);
    for (const subscriber of subscribers) {
      // Disconnect stalled clients so reconnecting can load the current snapshot.
      if ((subscriber.desiredSize ?? 0) < -256) {
        subscribers.delete(subscriber);
        subscriber.error(new Error('SSE client fell behind'));
      } else {
        subscriber.enqueue(data);
      }
    }
  }

  const runner = createRunner(db, publish, changed, options.demoStepMs);
  const observer = createProcessObserver({
    ...options.observer,
    managedPids: runner.managedPids,
    onChange: changed,
  });
  const snapshot = () => db.snapshot(observer.sessions());

  function changed() {
    if (subscribers.size) publish({ type: 'snapshot', snapshot: snapshot() });
  }

  function events(headers: Headers) {
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(subscriber) {
        controller = subscriber;
        subscriber.enqueue(eventData({ type: 'snapshot', snapshot: snapshot() }));
        subscribers.add(subscriber);
      },
      cancel() {
        subscribers.delete(controller);
      },
    });
    headers.set('Content-Type', 'text/event-stream; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, no-transform');
    return new Response(stream, { headers });
  }

  async function scenario(kind: 'kickoff' | 'approval' | 'stop_all') {
    if (kind === 'stop_all') {
      await runner.stopAll();
      return [];
    }
    const agents = snapshot().agents;
    const demo = agents.find((agent) => agent.provider === 'demo') ?? agents[0];
    if (!demo) throw new OfficeError(409, 'Create an agent before launching a demo');
    const tasks = kind === 'approval'
      ? [{ title: '成果物の公開', prompt: '成果物を確認し、公開の承認を依頼してください。', agentId: demo.id, provider: 'demo' } as const]
      : [demo, ...agents.filter(({ id }) => id !== demo.id)].slice(0, 4).map((agent) => ({
          title: agent.teamName + 'の業務開始',
          prompt: '今日の優先事項と最初の作業を整理してください。',
          agentId: agent.id,
          provider: 'demo' as const,
        }));
    return runner.enqueue(tasks).map(({ id }) => id);
  }

  async function handle(request: Request, headers: Headers, disableIdleTimeout: () => void) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
    if (method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (method === 'GET' && path === '/api/health') return json({ ok: true, version: '0.1.0', pid: process.pid });

    const authorization = request.headers.get('Authorization');
    const eventToken = method === 'GET' && path === '/api/events' ? url.searchParams.get('token') : null;
    if (authorization !== 'Bearer ' + options.token && eventToken !== options.token) {
      headers.set('WWW-Authenticate', 'Bearer');
      return json({ error: 'Unauthorized' }, 401);
    }
    if (closing) throw new OfficeError(503, 'Server is shutting down');

    if (method === 'GET' && path === '/api/snapshot') return json(snapshot());
    if (method === 'GET' && path === '/api/events') {
      disableIdleTimeout();
      return events(headers);
    }
    if (method === 'POST' && path === '/api/agents') {
      const input = await body<CreateAgentInput>(request, agentFields, ['displayName', 'role', 'teamId', 'provider']);
      if (closing) throw new OfficeError(503, 'Server is shutting down');
      const agent = db.createAgent(input);
      changed();
      return json({ agent }, 201);
    }
    if (method === 'POST' && path === '/api/tasks') {
      const input = await body<CreateTaskInput>(request, taskFields, ['title', 'prompt', 'agentId']);
      if (closing) throw new OfficeError(503, 'Server is shutting down');
      const [task] = runner.enqueue([input]);
      return json({ task }, 201);
    }
    if (method === 'POST' && path === '/api/demo/scenario') {
      const { kind = 'kickoff' } = await body<{ kind?: 'kickoff' | 'approval' | 'stop_all' }>(
        request, { kind: oneOf('kickoff', 'approval', 'stop_all') }, [], true,
      );
      if (closing) throw new OfficeError(503, 'Server is shutting down');
      return json({ ok: true, startedTaskIds: await scenario(kind) });
    }

    const route = /^\/api\/(agents|tasks|approvals)\/([^/]+)(?:\/([^/]+))?$/.exec(path);
    if (!route) throw new OfficeError(404, 'Endpoint not found');
    const [, collection, encodedId, action] = route;
    let id: string;
    try {
      id = decodeURIComponent(encodedId!);
    } catch {
      throw new OfficeError(400, 'Invalid resource ID');
    }
    if (collection === 'agents' && !action && method === 'PATCH') {
      const input = await body<UpdateAgentInput>(request, {
        ...agentFields, statusNote: (value) => value === null || text(value),
      });
      if (closing) throw new OfficeError(503, 'Server is shutting down');
      const agent = db.updateAgent(id, input);
      changed();
      return json({ agent });
    }
    if (collection === 'agents' && !action && method === 'DELETE') {
      db.deleteAgent(id);
      changed();
      return json({ ok: true });
    }
    if (action === 'logs' && method === 'GET' && (collection === 'tasks' || collection === 'agents')) {
      const raw = url.searchParams.get('limit') ?? '200';
      const limit = Number(raw);
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(limit) || limit < 1) {
        throw new OfficeError(400, 'limit must be a positive integer');
      }
      return json({ logs: db.listLogs(collection === 'tasks' ? 'task' : 'agent', id, limit) });
    }
    if (collection === 'tasks' && action === 'stop' && method === 'POST') {
      return json({ task: await runner.stop(id) });
    }
    if (collection === 'approvals' && action === 'decide' && method === 'POST') {
      const { decision } = await body<{ decision: ApprovalDecision }>(request, { decision: oneOf('allow', 'deny') }, ['decision']);
      if (closing) throw new OfficeError(503, 'Server is shutting down');
      return json({ approval: runner.decide(id, decision) });
    }
    throw new OfficeError(404, 'Endpoint not found');
  }

  let server;
  try {
    server = Bun.serve({
      hostname: '127.0.0.1',
      port: options.port ?? 4318,
      maxRequestBodySize: 1024 * 1024,
      async fetch(request, instance) {
        const headers = new Headers({ Vary: 'Origin' });
        const origin = request.headers.get('Origin');
        if (origin && allowedOrigin.test(origin)) {
          headers.set('Access-Control-Allow-Origin', origin);
          headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
          headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
        }
        try {
          return await handle(request, headers, () => instance.timeout(request, 0));
        } catch (error) {
          if (error instanceof OfficeError) return Response.json({ error: error.message }, { status: error.status, headers });
          console.error(error);
          return Response.json({ error: 'Internal server error' }, { status: 500, headers });
        }
      },
    });
  } catch (error) {
    void observer.close();
    db.close();
    throw error;
  }
  runner.dispatch();

  const heartbeat = setInterval(() => publish({ type: 'heartbeat', timestamp: now() }), options.heartbeatMs ?? 20_000);
  const port = server.port!;
  return {
    server, port, baseUrl: 'http://127.0.0.1:' + port,
    close() {
      return closing ??= Promise.resolve().then(async () => {
        clearInterval(heartbeat);
        for (const subscriber of subscribers) subscriber.close();
        subscribers.clear();
        const stopped = server.stop(true);
        try {
          await Promise.all([observer.close(), runner.close(), stopped]);
        } finally {
          db.close();
        }
      });
    },
  };
}
