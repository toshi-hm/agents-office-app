import { OfficeError, now, openOfficeDb } from '../db.ts';
import { createProcessObserver, type ObserverOptions } from '../observer.ts';
import { createRunner } from '../runner.ts';
import { applyCorsHeaders } from './cors.ts';
import { handleRequest } from './handle-request.ts';
import { createSseHub } from './sse-hub.ts';

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
  const sse = createSseHub();
  const { publish } = sse;
  let closing: Promise<void> | undefined;

  const runner = createRunner(db, publish, changed, options.demoStepMs);
  const observer = createProcessObserver({
    ...options.observer,
    managedPids: runner.managedPids,
    onChange: changed,
  });
  const snapshot = () => db.snapshot(observer.sessions());

  function changed() {
    if (sse.hasSubscribers()) publish({ type: 'snapshot', snapshot: snapshot() });
  }

  function requireOpen() {
    if (closing) throw new OfficeError(503, 'Server is shutting down');
  }

  const services = { db, runner, snapshot, sse, changed, requireOpen };

  let server;
  try {
    server = Bun.serve({
      hostname: '127.0.0.1',
      port: options.port ?? 4318,
      maxRequestBodySize: 1024 * 1024,
      async fetch(request, instance) {
        const headers = applyCorsHeaders(request);
        try {
          return await handleRequest(request, headers, () => instance.timeout(request, 0), options.token, services);
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
        sse.close();
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
