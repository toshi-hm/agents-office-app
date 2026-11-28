import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

/**
 * Runs Tauri v2 CLI with Rust/Cargo automatically provided via Nix if not already on PATH.
 */
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: bun run scripts/tauri.ts <dev|build|...>');
  process.exit(1);
}

const hasCargo = Bun.which('cargo') !== null && Bun.which('rustc') !== null;
const root = resolve(import.meta.dir, '..');

let cmd: string[];
if (hasCargo) {
  cmd = ['bunx', 'tauri', ...args];
} else if (Bun.which('nix') !== null) {
  const hmFlake = resolve(homedir(), '.config/home-manager');
  const inputsFrom = existsSync(resolve(hmFlake, 'flake.nix'))
    ? ['--inputs-from', hmFlake]
    : [];
  cmd = [
    'nix',
    'shell',
    ...inputsFrom,
    'nixpkgs#rustc',
    'nixpkgs#cargo',
    '-c',
    'bunx',
    'tauri',
    ...args,
  ];
} else {
  console.error('Neither cargo nor nix was found on PATH. Install Rust or enter `nix develop`.');
  process.exit(1);
}

const proc = Bun.spawn(cmd, {
  cwd: root,
  stdio: ['inherit', 'inherit', 'inherit'],
});

const exitCode = await proc.exited;
process.exit(exitCode);
