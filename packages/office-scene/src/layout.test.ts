import { describe, expect, test } from 'bun:test';
import {
  CHAIR_OFFSET,
  MAX_MEMBERS,
  STAND_OFFSET,
  buildOfficeLayout,
  departmentRank,
  getLayoutSignature,
} from './layout.ts';
import { ROSTER, TEAMS, member } from './test-fixtures.ts';
import type { OfficeLayout } from './types.ts';

function expectInsideFloor(layout: OfficeLayout) {
  const halfWidth = layout.floor.width / 2;
  const halfDepth = layout.floor.depth / 2;
  for (const placement of layout.members) {
    for (const [x, , z] of [
      placement.position,
      placement.deskPosition,
      placement.chairPosition,
    ]) {
      expect(Math.abs(x)).toBeLessThan(halfWidth - 0.2);
      expect(Math.abs(z)).toBeLessThan(halfDepth - 0.2);
    }
  }
}

describe('buildOfficeLayout', () => {
  test('orders zones with the executive team first, then departments', () => {
    const layout = buildOfficeLayout(ROSTER, [...TEAMS].reverse());
    expect(layout.zones.map((zone) => zone.teamName)).toEqual([
      '経営',
      '開発部',
      'note部',
      'YouTube部',
    ]);
  });

  test('places managers before employees inside a team', () => {
    const layout = buildOfficeLayout(ROSTER, TEAMS);
    const dev = layout.members.filter((p) => p.member.teamId === 'dev').map((p) => p.member.id);
    expect(dev).toEqual(['dev1', 'dev2', 'dev3']);
  });

  test('keeps every station inside the floor and apart from the others', () => {
    const roster = Array.from({ length: 24 }, (_, i) =>
      member(`m${String(i).padStart(2, '0')}`, TEAMS[i % TEAMS.length]!.id),
    );
    const layout = buildOfficeLayout(roster, TEAMS);
    expectInsideFloor(layout);
    for (const [index, left] of layout.members.entries()) {
      for (const right of layout.members.slice(index + 1)) {
        const distance = Math.hypot(
          left.deskPosition[0] - right.deskPosition[0],
          left.deskPosition[2] - right.deskPosition[2],
        );
        expect(distance).toBeGreaterThan(1.9);
      }
    }
  });

  test('keeps each station inside its own rug', () => {
    const layout = buildOfficeLayout(ROSTER, TEAMS);
    for (const placement of layout.members) {
      const zone = layout.zones.find((z) => z.teamId === placement.member.teamId)!;
      for (const [x, , z] of [placement.position, placement.chairPosition]) {
        expect(Math.abs(x - zone.center[0])).toBeLessThanOrEqual(zone.width / 2);
        expect(Math.abs(z - zone.center[2])).toBeLessThanOrEqual(zone.depth / 2);
      }
    }
  });

  test('derives chair and standing spots from the desk', () => {
    const [first] = buildOfficeLayout(ROSTER, TEAMS).members;
    const desk = first!.deskPosition;
    expect(first!.chairPosition).toEqual([desk[0], 0, desk[2] + CHAIR_OFFSET[2]]);
    expect(first!.position).toEqual([desk[0] + STAND_OFFSET[0], 0, desk[2] + STAND_OFFSET[2]]);
  });

  test('is deterministic regardless of input order', () => {
    const forward = buildOfficeLayout(ROSTER, TEAMS);
    const backward = buildOfficeLayout([...ROSTER].reverse(), [...TEAMS].reverse());
    expect(backward).toEqual(forward);
  });

  test('keeps a zone for a team without members and creates one for an unknown team', () => {
    const layout = buildOfficeLayout([member('x', 'ghost')], TEAMS);
    expect(layout.zones).toHaveLength(TEAMS.length + 1);
    expect(layout.zones.at(-1)?.teamName).toBe('ghost');
    expect(layout.members).toHaveLength(1);
  });

  test('builds an empty room', () => {
    const layout = buildOfficeLayout([]);
    expect(layout.members).toHaveLength(0);
    expect(layout.floor.width).toBeGreaterThan(0);
    expect(layout.floor.depth).toBeGreaterThan(0);
  });

  test('rejects duplicates and oversized rosters', () => {
    expect(() => buildOfficeLayout([member('a', 'dev'), member('a', 'dev')])).toThrow(TypeError);
    const crowd = Array.from({ length: MAX_MEMBERS + 1 }, (_, i) => member(`m${i}`, 'dev'));
    expect(() => buildOfficeLayout(crowd)).toThrow(RangeError);
  });

  test('freezes the result', () => {
    const layout = buildOfficeLayout(ROSTER, TEAMS);
    expect(Object.isFrozen(layout)).toBe(true);
    expect(Object.isFrozen(layout.members[0])).toBe(true);
  });
});

describe('layout helpers', () => {
  test('ranks the known departments', () => {
    expect(['経営', '開発部', 'note部', 'YouTube部', '総務'].map(departmentRank)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  test('signature ignores unrelated fields but tracks identity changes', () => {
    const base = getLayoutSignature(ROSTER, TEAMS);
    const noisy = ROSTER.map((m) => ({ ...m, statusNote: 'busy', updatedAt: 'now' }));
    expect(getLayoutSignature(noisy, TEAMS)).toBe(base);
    const renamed = ROSTER.map((m, i) => (i === 0 ? { ...m, displayName: '改名' } : m));
    expect(getLayoutSignature(renamed, TEAMS)).not.toBe(base);
  });
});
