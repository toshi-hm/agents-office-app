import type { OfficeLayout, SceneMember, SceneTeam } from '../types.ts';
import { buildDecor } from './build-decor.ts';
import { MAX_MEMBERS, WALL_HEIGHT } from './constants.ts';
import { point } from './geometry.ts';
import { placeStations, placeZone } from './place-zone.ts';
import { getZoneBounds } from './zone-bounds.ts';
import { draftZones } from './zone-drafts.ts';

function assertValidRoster(members: readonly SceneMember[]): void {
  if (members.length > MAX_MEMBERS) {
    throw new RangeError(`Office layout supports at most ${MAX_MEMBERS} members.`);
  }
  const ids = new Set<string>();
  for (const member of members) {
    if (ids.has(member.id)) throw new TypeError(`Duplicate scene member id: ${member.id}`);
    ids.add(member.id);
  }
}

/**
 * Deterministic, immutable arrangement of the roster: one rug zone per team in a compact grid,
 * the executive zone first. Only identity fields matter, so activity updates never move desks.
 */
export function buildOfficeLayout(
  members: readonly SceneMember[],
  teams: readonly SceneTeam[] = [],
): OfficeLayout {
  assertValidRoster(members);
  const drafts = draftZones(members, teams);
  const { floor, bounds } = getZoneBounds(drafts);
  const placed = drafts.map((draft, index) => ({ draft, area: bounds[index]! }));

  return Object.freeze({
    members: Object.freeze(placed.flatMap(({ draft, area }) => placeStations(draft, area))),
    zones: Object.freeze(placed.map(({ draft, area }) => placeZone(draft, area))),
    decor: buildDecor(floor.width, floor.depth),
    floor: Object.freeze({ ...floor, center: point(0, 0, 0) }),
    wallHeight: WALL_HEIGHT,
  });
}
