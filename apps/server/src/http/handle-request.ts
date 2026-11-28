import { OfficeError } from '../db/error.ts';
import { isAuthorized } from './auth.ts';
import { createAgent } from './routes/create-agent.ts';
import { createTask } from './routes/create-task.ts';
import { decideApproval } from './routes/decide-approval.ts';
import { deleteAgent } from './routes/delete-agent.ts';
import { getSnapshot } from './routes/get-snapshot.ts';
import { health } from './routes/health.ts';
import { launchDemoScenario } from './routes/launch-demo-scenario.ts';
import { listLogs } from './routes/list-logs.ts';
import { stopTask } from './routes/stop-task.ts';
import { streamEvents } from './routes/stream-events.ts';
import type { RouteServices } from './routes/types.ts';
import { updateAgent } from './routes/update-agent.ts';

export async function handleRequest(
  request: Request, headers: Headers, disableIdleTimeout: () => void, token: string, services: RouteServices,
) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (method === 'GET' && path === '/api/health') return health(json);

  if (!isAuthorized(request, url, token)) {
    headers.set('WWW-Authenticate', 'Bearer');
    return json({ error: 'Unauthorized' }, 401);
  }
  services.requireOpen();

  if (method === 'GET' && path === '/api/snapshot') return getSnapshot(json, services);
  if (method === 'GET' && path === '/api/events') return streamEvents(headers, disableIdleTimeout, services);
  if (method === 'POST' && path === '/api/agents') return createAgent(request, json, services);
  if (method === 'POST' && path === '/api/tasks') return createTask(request, json, services);
  if (method === 'POST' && path === '/api/demo/scenario') return launchDemoScenario(request, json, services);

  const route = /^\/api\/(agents|tasks|approvals)\/([^/]+)(?:\/([^/]+))?$/.exec(path);
  if (!route) throw new OfficeError(404, 'Endpoint not found');
  const [, collection, encodedId, action] = route;
  let id: string;
  try {
    id = decodeURIComponent(encodedId!);
  } catch {
    throw new OfficeError(400, 'Invalid resource ID');
  }
  if (collection === 'agents' && !action && method === 'PATCH') return updateAgent(id, request, json, services);
  if (collection === 'agents' && !action && method === 'DELETE') return deleteAgent(id, json, services);
  if (action === 'logs' && method === 'GET' && (collection === 'tasks' || collection === 'agents')) {
    return listLogs(collection === 'tasks' ? 'task' : 'agent', id, url, json, services);
  }
  if (collection === 'tasks' && action === 'stop' && method === 'POST') return stopTask(id, json, services);
  if (collection === 'approvals' && action === 'decide' && method === 'POST') {
    return decideApproval(id, request, json, services);
  }
  throw new OfficeError(404, 'Endpoint not found');
}
