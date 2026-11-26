import { expect, test } from 'bun:test';
import type { Agent, ApprovalRequest, ExecutionLog, OfficeSnapshot, OfficeSseEvent, Task } from '@agents-office-app/domain';
import { createOfficeServer, type OfficeServerOptions } from './server.ts';

function setup(options: Partial<OfficeServerOptions> = {}) {
  const token = 'test-secret';
  const office = createOfficeServer({
    port: 0, token, demoStepMs: 5, observer: { readProcesses: async () => '' }, ...options,
  });
  const api = (path: string, method = 'GET', data?: unknown) => fetch(office.baseUrl + '/api' + path, {
    method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const snapshot = async (): Promise<OfficeSnapshot> => (await api('/snapshot')).json();

  async function waitFor<T>(predicate: (state: OfficeSnapshot) => T | undefined | false) {
    for (let attempt = 0; attempt < 400; attempt++) {
      const match = predicate(await snapshot());
      if (match) return match;
      await Bun.sleep(5);
    }
    throw new Error('Timed out waiting for office state');
  }

  async function task(agentId = 'agent-demo', prompt = 'Start work'): Promise<Task> {
    const response = await api('/tasks', 'POST', { title: 'Task', prompt, agentId, provider: 'demo' });
    expect(response.status).toBe(201);
    return (await response.json() as { task: Task }).task;
  }

  return { ...office, token, api, snapshot, waitFor, task };
}

test('health, authentication, CORS, agent CRUD, and request validation', async () => {
  const office = setup();
  try {
    const health = await fetch(office.baseUrl + '/api/health');
    expect(await health.json()).toEqual({ ok: true, version: '0.1.0', pid: process.pid });
    for (const path of ['/snapshot', '/snapshot?token=' + office.token, '/events']) {
      const unauthenticated = await fetch(office.baseUrl + '/api' + path);
      expect(unauthenticated.status).toBe(401);
    }
    for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173', 'tauri://localhost', 'http://tauri.localhost']) {
      const cors = await fetch(office.baseUrl + '/api/agents', { method: 'OPTIONS', headers: { Origin: origin } });
      expect(cors.status).toBe(204);
      expect(cors.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    }
    const rejected = await fetch(office.baseUrl + '/api/health', { headers: { Origin: 'http://localhost.evil.test' } });
    expect(rejected.headers.has('Access-Control-Allow-Origin')).toBe(false);

    const input = { displayName: 'New agent', role: 'employee', provider: 'demo', teamId: 'team-dev' };
    expect((await office.api('/agents', 'POST', { ...input, role: 'bad' })).status).toBe(400);
    expect((await office.api('/agents', 'POST', { ...input, teamId: 'missing' })).status).toBe(404);
    expect((await office.api('/tasks', 'POST', { title: 'Invalid', prompt: 'Work', agentId: 'missing' })).status).toBe(404);
    const invalidJson = await fetch(office.baseUrl + '/api/agents', {
      method: 'POST', headers: { Authorization: 'Bearer ' + office.token }, body: '{',
    });
    expect(invalidJson.status).toBe(400);

    const created = await office.api('/agents', 'POST', input);
    expect(created.status).toBe(201);
    const { agent } = await created.json() as { agent: Agent };
    const url = '/agents/' + agent.id;
    const update = await office.api(url, 'PATCH', { teamId: 'team-note', statusNote: 'Available' });
    expect(update.status).toBe(200);
    expect((await update.json() as { agent: Agent }).agent).toMatchObject({ teamName: 'note部', statusNote: 'Available' });
    expect((await office.api(url, 'PATCH', { statusNote: null })).status).toBe(200);
    const removed = await office.api(url, 'DELETE');
    expect(await removed.json()).toEqual({ ok: true });
    expect((await office.api(url, 'DELETE')).status).toBe(404);
    expect((await office.api(url + '/logs')).status).toBe(404);
    expect((await office.api('/tasks/missing/stop', 'POST')).status).toBe(404);
    expect((await office.api('/tasks/missing/logs')).status).toBe(404);
    expect((await office.api('/approvals/missing/decide', 'POST', { decision: 'deny' })).status).toBe(404);
    expect((await office.api('/demo/scenario', 'POST', { kind: 'missing' })).status).toBe(400);
    expect((await office.api('/missing')).status).toBe(404);
    expect((await office.snapshot()).agents.some(({ id }) => id === agent.id)).toBe(false);
  } finally {
    await office.close();
  }
});

test('streams SSE snapshots, heartbeat, execution logs, and task completion', async () => {
  const office = setup({ heartbeatMs: 25 });
  const abort = new AbortController();
  const deadline = setTimeout(() => abort.abort(), 3000);
  try {
    const response = await fetch(office.baseUrl + '/api/events?token=' + office.token, { signal: abort.signal });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    const task = await office.task();
    const seen = new Set<string>();
    let pending = '';
    while (!['snapshot', 'log', 'task_finished', 'heartbeat'].every((type) => seen.has(type))) {
      const chunk = await reader.read();
      if (chunk.done) throw new Error('SSE closed early');
      pending += chunk.value;
      for (let end = pending.indexOf('\n\n'); end !== -1; end = pending.indexOf('\n\n')) {
        const event: OfficeSseEvent = JSON.parse(pending.slice(6, end));
        pending = pending.slice(end + 2);
        seen.add(event.type);
        if (event.type === 'task_finished') expect(event.task).toMatchObject({ id: task.id, status: 'succeeded' });
      }
    }
    await reader.cancel();
    const logResponse = await office.api('/tasks/' + task.id + '/logs?limit=2');
    const { logs } = await logResponse.json() as { logs: ExecutionLog[] };
    expect(logs).toHaveLength(2);
    expect(logs[0]!.id).toBeLessThan(logs[1]!.id);
    expect(logs[1]!.text).toContain('完了');
    const byAgent = await office.api('/agents/' + task.agentId + '/logs?limit=2');
    expect(await byAgent.json()).toEqual({ logs });
    expect((await office.api('/agents/' + task.agentId + '/logs?limit=-1')).status).toBe(400);
  } finally {
    clearTimeout(deadline);
    abort.abort();
    await office.close();
  }
});

test('approval scenario supports allow, deny and stopping a pending approval', async () => {
  const office = setup();
  try {
    async function startApproval() {
      const response = await office.api('/demo/scenario', 'POST', { kind: 'approval' });
      expect(response.status).toBe(200);
      const { startedTaskIds } = await response.json() as { startedTaskIds: string[] };
      return office.waitFor((state) => state.approvals.find(({ taskId }) => taskId === startedTaskIds[0]));
    }

    for (const decision of ['allow', 'deny'] as const) {
      const request = await startApproval();
      expect(request.status).toBe('pending');
      const path = '/approvals/' + request.id + '/decide';
      expect((await office.api(path, 'POST', { decision: 'bad' })).status).toBe(400);
      expect((await office.api('/agents/' + request.agentId, 'DELETE')).status).toBe(409);
      const response = await office.api(path, 'POST', { decision });
      expect(response.status).toBe(200);
      const { approval } = await response.json() as { approval: ApprovalRequest };
      expect(approval).toMatchObject({ decision, status: decision === 'allow' ? 'approved' : 'rejected' });
      expect((await office.api(path, 'POST', { decision })).status).toBe(409);
      const status = decision === 'allow' ? 'succeeded' : 'cancelled';
      await office.waitFor((state) => state.tasks.some((task) => task.id === request.taskId && task.status === status));
    }

    const pending = await startApproval();
    const stopped = await office.api('/tasks/' + pending.taskId + '/stop', 'POST');
    expect(await stopped.json()).toMatchObject({ task: { status: 'cancelled' } });
    const state = await office.snapshot();
    expect(state.approvals.find(({ id }) => id === pending.id)?.status).toBe('expired');
    expect(state.health).toMatchObject({ slotsUsed: 0, pendingApprovals: 0 });
  } finally {
    await office.close();
  }
});

test('four slots dispatch the oldest eligible tasks and stop_all cancels the queue atomically', async () => {
  const office = setup();
  try {
    const agents = (await office.snapshot()).agents;
    const running: Task[] = [];
    for (const agent of agents.slice(0, 4)) running.push(await office.task(agent.id, 'Approve'));
    const blocked = await office.task(running[0]!.agentId, 'Approve');
    const eligible = await office.task(agents[4]!.id, 'Approve');
    const later = await office.task(agents[5]!.id, 'Approve');
    const state = await office.snapshot();
    expect(state.health).toMatchObject({ slotsUsed: 4, queuedTasks: 3 });
    await office.api('/tasks/' + running[1]!.id + '/stop', 'POST');
    const progressed = await office.waitFor((current) =>
      current.executions.some(({ taskId }) => taskId === eligible.id) && current);
    expect(progressed.tasks.find(({ id }) => id === blocked.id)?.status).toBe('queued');
    expect(progressed.tasks.find(({ id }) => id === later.id)?.status).toBe('queued');
    await office.api('/tasks/' + running[0]!.id + '/stop', 'POST');
    await office.waitFor((current) => current.executions.some(({ taskId }) => taskId === blocked.id));
    const stopped = await office.api('/demo/scenario', 'POST', { kind: 'stop_all' });
    expect(await stopped.json()).toEqual({ ok: true, startedTaskIds: [] });
    const settled = await office.snapshot();
    expect(settled.health).toMatchObject({ slotsUsed: 0, queuedTasks: 0, pendingApprovals: 0 });
    expect(settled.tasks.every(({ status }) => status === 'cancelled')).toBe(true);
    expect(settled.executions.some(({ taskId }) => taskId === later.id)).toBe(false);

    const kickoff = await office.api('/demo/scenario', 'POST');
    expect((await kickoff.json() as { startedTaskIds: string[] }).startedTaskIds).toHaveLength(4);
    await office.waitFor((current) => current.tasks.filter(({ status }) => status === 'succeeded').length === 4);
  } finally {
    await office.close();
  }
});
