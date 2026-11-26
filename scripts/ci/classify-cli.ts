import { appendFileSync } from 'node:fs';
import { classifyChanges } from './classify-changes.ts';

function readChangedFiles(baseRef: string, headRef: string): string[] | null {
  const proc = Bun.spawnSync(['git', 'diff', '--name-only', `${baseRef}...${headRef}`], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (proc.exitCode === 0) {
    return proc.stdout.toString().split('\n').filter(Boolean);
  }
  const fallback = Bun.spawnSync(['git', 'diff', '--name-only', `${baseRef}..${headRef}`], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (fallback.exitCode !== 0) {
    return null;
  }
  return fallback.stdout.toString().split('\n').filter(Boolean);
}

const runAll = process.env.CI_RUN_ALL === 'true';
const base = process.env.CI_BASE_SHA ?? '';
const head = process.env.CI_HEAD_SHA ?? 'HEAD';
const hasBase = Boolean(base) && !/^0+$/.test(base);
const changed = !runAll && hasBase ? readChangedFiles(base, head) : null;
const forceAll = runAll || !hasBase || changed === null;
const matrix = classifyChanges(changed ?? [], forceAll);

const lines = [
  `docs=${matrix.docs}`,
  `typecheck=${matrix.typecheck}`,
  `test_domain=${matrix.testDomain}`,
  `test_server=${matrix.testServer}`,
  `test_ui=${matrix.testUi}`,
  `build_js=${matrix.buildJs}`,
  `tauri_check=${matrix.tauriCheck}`,
];

const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  appendFileSync(outputFile, `${lines.join('\n')}\n`);
}
console.log(
  JSON.stringify({ changedCount: changed?.length ?? null, forceAll, matrix }, null, 2),
);
