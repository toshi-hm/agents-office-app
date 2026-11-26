import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '../..');
const LINK_RE = /\[[^\]]+\]\(([^)]+)\)/g;

function collectMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdown(full));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

const files = [join(ROOT, 'README.md'), ...collectMarkdown(join(ROOT, 'docs'))].filter((file) =>
  existsSync(file),
);

const errors: string[] = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(LINK_RE)) {
    const rawTarget = match[1]?.trim() ?? '';
    if (
      !rawTarget ||
      rawTarget.startsWith('http://') ||
      rawTarget.startsWith('https://') ||
      rawTarget.startsWith('mailto:') ||
      rawTarget.startsWith('#')
    ) {
      continue;
    }
    const cleanPath = rawTarget.split('#')[0] ?? '';
    if (!cleanPath) continue;
    const resolved = resolve(dirname(file), cleanPath);
    if (!existsSync(resolved)) {
      errors.push(`${file.replace(`${ROOT}/`, '')}: broken link -> ${rawTarget}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Broken Markdown links detected:\n' + errors.join('\n'));
  process.exit(1);
}

console.log(`Checked ${files.length} Markdown files: all links valid.`);
