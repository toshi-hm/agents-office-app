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

const EMPTY_MATRIX: CiMatrix = Object.freeze({
  docs: false,
  typecheck: false,
  testDomain: false,
  testServer: false,
  testUi: false,
  buildJs: false,
  tauriCheck: false,
});

const JS_ROOT_FILES = new Set([
  'package.json',
  'bun.lock',
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.typecheck.json',
]);

const normalize = (file: string): string => file.replace(/\\/g, '/').replace(/^\.\//, '').trim();

export function classifyChanges(rawFiles: readonly string[], runAll = false): CiMatrix {
  if (runAll) return ALL_TRUE;

  const files = rawFiles.map(normalize).filter(Boolean);
  if (files.length === 0) return EMPTY_MATRIX;

  const state = { ...EMPTY_MATRIX };
  const markAllJs = () => {
    state.typecheck = true;
    state.testDomain = true;
    state.testServer = true;
    state.testUi = true;
    state.buildJs = true;
  };

  for (const file of files) {
    if (file.startsWith('.github/workflows/')) return ALL_TRUE;
    if (file.startsWith('docs/') || file.endsWith('.md')) {
      state.docs = true;
    } else if (file.startsWith('scripts/ci/')) {
      state.docs = true;
      state.typecheck = true;
    } else if (file.startsWith('src-tauri/')) {
      state.tauriCheck = true;
    } else if (JS_ROOT_FILES.has(file) || file.startsWith('packages/domain/')) {
      markAllJs();
    } else if (file.startsWith('apps/server/')) {
      state.typecheck = true;
      state.testServer = true;
      state.buildJs = true;
    } else if (file.startsWith('apps/desktop/') || file.startsWith('packages/office-scene/')) {
      state.typecheck = true;
      state.testUi = true;
      state.buildJs = true;
    } else if (file.startsWith('scripts/')) {
      state.typecheck = true;
    } else {
      // Fail-safe for newly added packages/apps or unrecognized root config files.
      markAllJs();
    }
  }

  return Object.freeze(state);
}
