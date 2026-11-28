import { describe, expect, test } from 'bun:test';
import { defaultLabelMode, shouldShowMemberLabel } from './scene-labels.ts';
import { resolveReducedMotion } from './use-motion-preference.ts';

describe('nameplate visibility', () => {
  test('all mode shows everyone', () => {
    expect(shouldShowMemberLabel('all', 'a', null, 'idle')).toBe(true);
  });

  test('focus mode keeps the selected and the active', () => {
    expect(shouldShowMemberLabel('focus', 'a', null, 'idle')).toBe(false);
    expect(shouldShowMemberLabel('focus', 'a', 'a', 'idle')).toBe(true);
    for (const activity of ['starting', 'working', 'waiting_approval', 'error'] as const) {
      expect(shouldShowMemberLabel('focus', 'a', 'b', activity)).toBe(true);
    }
    expect(shouldShowMemberLabel('focus', 'a', null, 'external')).toBe(false);
  });

  test('compact starts decluttered', () => {
    expect(defaultLabelMode(true)).toBe('focus');
    expect(defaultLabelMode(false)).toBe('all');
  });
});

describe('motion preference', () => {
  test('follows the system unless overridden', () => {
    expect(resolveReducedMotion('system', true)).toBe(true);
    expect(resolveReducedMotion('system', false)).toBe(false);
    expect(resolveReducedMotion('normal', true)).toBe(false);
    expect(resolveReducedMotion('reduce', false)).toBe(true);
  });
});
