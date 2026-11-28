import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

/**
 * Browser preview launcher (starts Bun backend + Vite desktop dev server together).
 * For the full native macOS app, run `bun run tauri:dev`.
 */
const root = resolve(import.meta.dir, '..');
const token = randomBytes(16).toString('hex');
const port = process.env.AGENTS_OFFICE_PORT ?? '4318';

const server = Bun.spawn(['bun', 'run', '--cwd', 'apps/server', 'src/index.ts'], {
  cwd: root,
  env: {
    ...process.env,
    AGENTS_OFFICE_PORT: port,
    AGENTS_OFFICE_TOKEN: token,
  },
  stdout: 'inherit',
  stderr: 'inherit',
});

const web = Bun.spawn(['bun', 'run', '--cwd', 'apps/desktop', 'dev'], {
  cwd: root,
  env: {
    ...process.env,
    VITE_AGENTS_OFFICE_URL: `http://127.0.0.1:${port}`,
    VITE_AGENTS_OFFICE_TOKEN: token,
  },
  stdout: 'inherit',
  stderr: 'inherit',
});

const shutdown = () => {
  server.kill('SIGTERM');
  web.kill('SIGTERM');
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await Promise.race([server.exited, web.exited]);
shutdown();
