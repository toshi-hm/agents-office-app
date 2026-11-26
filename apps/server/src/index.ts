import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createOfficeServer } from './server.ts';

const rawPort = Bun.env.AGENTS_OFFICE_PORT ?? '4318';
const port = Number(rawPort);
if (!/^\d+$/.test(rawPort) || port > 65535) throw new Error('AGENTS_OFFICE_PORT must be an integer from 0 to 65535');
const token = Bun.env.AGENTS_OFFICE_TOKEN || crypto.randomUUID();
const dir = Bun.env.AGENTS_OFFICE_DATA_DIR || join(homedir(), 'Library', 'Application Support', 'AgentsOffice');
mkdirSync(dir, { recursive: true, mode: 0o700 });
const office = createOfficeServer({ token, port, dbPath: join(dir, 'office.sqlite') });

function shutdown() {
  void office.close().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  }).finally(() => {
    process.off('SIGINT', shutdown);
    process.off('SIGTERM', shutdown);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
console.log(JSON.stringify({ type: 'ready', port: office.port, baseUrl: office.baseUrl, pid: process.pid }));
