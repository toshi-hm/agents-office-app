import { describe, expect, test } from 'bun:test';
import { classifyChanges } from './classify-changes.ts';

describe('classifyChanges', () => {
  test('docs-only changes only trigger docs check and skip build/tests/tauri', () => {
    expect(classifyChanges(['README.md', 'docs/architecture/api-contract.md'])).toEqual({
      docs: true,
      typecheck: false,
      testDomain: false,
      testServer: false,
      testUi: false,
      buildJs: false,
      tauriCheck: false,
    });
  });

  test('server-only changes skip ui tests, domain tests, docs, and macOS tauri check', () => {
    expect(classifyChanges(['apps/server/src/http/cors.ts'])).toEqual({
      docs: false,
      typecheck: true,
      testDomain: false,
      testServer: true,
      testUi: false,
      buildJs: true,
      tauriCheck: false,
    });
  });

  test('ui or office-scene changes skip server tests and macOS tauri check', () => {
    expect(classifyChanges(['apps/desktop/src/App.tsx', 'packages/office-scene/src/index.ts'])).toEqual({
      docs: false,
      typecheck: true,
      testDomain: false,
      testServer: false,
      testUi: true,
      buildJs: true,
      tauriCheck: false,
    });
  });

  test('domain or root dependency changes fan out across all JS/TS checks without macOS tauri', () => {
    expect(classifyChanges(['packages/domain/src/types/agent.ts'])).toEqual({
      docs: false,
      typecheck: true,
      testDomain: true,
      testServer: true,
      testUi: true,
      buildJs: true,
      tauriCheck: false,
    });
  });

  test('src-tauri-only changes only run macOS tauri check', () => {
    expect(classifyChanges(['src-tauri/src/tray.rs', 'src-tauri/Cargo.toml'])).toEqual({
      docs: false,
      typecheck: false,
      testDomain: false,
      testServer: false,
      testUi: false,
      buildJs: false,
      tauriCheck: true,
    });
  });

  test('workflow changes or runAll trigger every CI job', () => {
    const expectedAll = {
      docs: true,
      typecheck: true,
      testDomain: true,
      testServer: true,
      testUi: true,
      buildJs: true,
      tauriCheck: true,
    };
    expect(classifyChanges(['.github/workflows/ci.yml'])).toEqual(expectedAll);
    expect(classifyChanges(['README.md'], true)).toEqual(expectedAll);
  });
});
