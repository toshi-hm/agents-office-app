export type CiMatrix = Readonly<{
  docs: boolean;
  typecheck: boolean;
  testDomain: boolean;
  testServer: boolean;
  testUi: boolean;
  buildJs: boolean;
  tauriCheck: boolean;
}>;

const ALL_TRUE: CiMatrix = Object.freeze({
  docs: true,
  typecheck: true,
  testDomain: true,
  testServer: true,
  testUi: true,
  buildJs: true,
  tauriCheck: true,
});

const JS_ROOT_FILES = new Set([
  'package.json',
  'bun.lock',
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.typecheck.json',
]);

function normalize(file: string): string {
  return file.replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function isMarkdown(file: string): boolean {
  return file.endsWith('.md');
}

export function classifyChanges(rawFiles: readonly string[], runAll = false): CiMatrix {
  if (runAll) return ALL_TRUE;

  const files = rawFiles.map(normalize).filter(Boolean);
  if (files.length === 0) {
    return Object.freeze({
      docs: false,
      typecheck: false,
      testDomain: false,
      testServer: false,
      testUi: false,
      buildJs: false,
      tauriCheck: false,
    });
  }

  let docs = false;
  let typecheck = false;
  let testDomain = false;
  let testServer = false;
  let testUi = false;
  let buildJs = false;
  let tauriCheck = false;

  for (const file of files) {
    if (file.startsWith('.github/workflows/')) return ALL_TRUE;

    if (file.startsWith('docs/') || isMarkdown(file)) {
      docs = true;
      continue;
    }

    if (file.startsWith('scripts/ci/')) {
      docs = true;
      typecheck = true;
      continue;
    }

    if (file.startsWith('src-tauri/')) {
      tauriCheck = true;
      continue;
    }

    if (JS_ROOT_FILES.has(file) || file.startsWith('packages/domain/')) {
      typecheck = true;
      testDomain = true;
      testServer = true;
      testUi = true;
      buildJs = true;
      continue;
    }

    if (file.startsWith('apps/server/')) {
      typecheck = true;
      testServer = true;
      buildJs = true;
      continue;
    }

    if (file.startsWith('apps/desktop/') || file.startsWith('packages/office-scene/')) {
      typecheck = true;
      testUi = true;
      buildJs = true;
      continue;
    }

    if (file.startsWith('scripts/')) {
      typecheck = true;
    }
  }

  return Object.freeze({
    docs,
    typecheck,
    testDomain,
    testServer,
    testUi,
    buildJs,
    tauriCheck,
  });
}
