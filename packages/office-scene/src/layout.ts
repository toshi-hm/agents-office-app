import type {
  OfficeLayout,
  SceneDecor,
  SceneMember,
  ScenePlacement,
  ScenePosition,
  SceneTeam,
  SceneZone,
} from './types.ts';

export const MAX_MEMBERS = 100;
export const STATION_PITCH_X = 2.15;
export const STATION_PITCH_Z = 2.05;
/** Chair centre relative to the desk centre. The character faces -Z, towards the desk. */
export const CHAIR_OFFSET: ScenePosition = [0, 0, 0.62];
/** Standing spot relative to the desk centre: beside the chair, never inside furniture. */
export const STAND_OFFSET: ScenePosition = [-0.84, 0, 0.7];
export const WALL_HEIGHT = 1.2;

const MIN_ZONE_WIDTH = 2.7;
const ZONE_BACK_PADDING = 0.34;
const ZONE_GAP = 0.34;
const SIDE_MARGIN = 0.72;
/** Room behind the back row for bookcases and the team signs. */
const BACK_MARGIN = 0.82;
const FRONT_MARGIN = 0.56;
const MIN_FLOOR_WIDTH = 6.4;
const MIN_FLOOR_DEPTH = 5.4;
const FALLBACK_TEAM_COLOR = '#8a9a7b';

const ROLE_ORDER: Readonly<Record<SceneMember['role'], number>> = {
  president: 0,
  dept_manager: 1,
  employee: 2,
};

type ZoneDraft = {
  team: SceneTeam;
  members: SceneMember[];
  columns: number;
  rows: number;
  width: number;
  depth: number;
};

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function point(x: number, y: number, z: number): ScenePosition {
  return Object.freeze([x, y, z]) as ScenePosition;
}

function add(base: ScenePosition, offset: ScenePosition): ScenePosition {
  return point(base[0] + offset[0], base[1] + offset[1], base[2] + offset[2]);
}

/** Preferred order of the well-known departments, used when sortOrder ties. */
export function departmentRank(name: string): number {
  const normalized = name.trim().toLowerCase();
  if (normalized === '経営' || normalized === 'executive') return 0;
  if (['開発', '開発部', 'development'].includes(normalized)) return 1;
  if (['note', 'note部'].includes(normalized)) return 2;
  if (['youtube', 'youtube部'].includes(normalized)) return 3;
  return 4;
}

function compareTeams(left: SceneTeam, right: SceneTeam): number {
  const kind = (team: SceneTeam) => (team.kind === 'executive' ? 0 : 1);
  return (
    kind(left) - kind(right) ||
    left.sortOrder - right.sortOrder ||
    departmentRank(left.name) - departmentRank(right.name) ||
    compareText(left.id, right.id)
  );
}

function stationColumns(count: number): number {
  if (count <= 1) return 1;
  return count <= 6 ? 2 : 3;
}

function zoneColumns(count: number): number {
  if (count <= 1) return 1;
  return count <= 6 ? 2 : 3;
}

function draftZones(members: readonly SceneMember[], teams: readonly SceneTeam[]): ZoneDraft[] {
  const known = new Map<string, SceneTeam>(teams.map((team) => [team.id, team]));
  const grouped = new Map<string, SceneMember[]>(teams.map((team) => [team.id, []]));

  for (const member of members) {
    if (!known.has(member.teamId)) {
      known.set(member.teamId, {
        id: member.teamId,
        name: member.teamName,
        kind: member.role === 'president' ? 'executive' : 'department',
        color: FALLBACK_TEAM_COLOR,
        sortOrder: Number.MAX_SAFE_INTEGER,
      });
    }
    const group = grouped.get(member.teamId);
    if (group) group.push(member);
    else grouped.set(member.teamId, [member]);
  }

  return [...known.values()].sort(compareTeams).map((team) => {
    const roster = [...(grouped.get(team.id) ?? [])].sort(
      (left, right) =>
        ROLE_ORDER[left.role] - ROLE_ORDER[right.role] || compareText(left.id, right.id),
    );
    const columns = stationColumns(roster.length);
    const rows = Math.max(1, Math.ceil(roster.length / columns));
    return {
      team,
      members: roster,
      columns,
      rows,
      width: Math.max(MIN_ZONE_WIDTH, columns * STATION_PITCH_X + 0.2),
      depth: rows * STATION_PITCH_Z + ZONE_BACK_PADDING,
    };
  });
}

function buildDecor(width: number, depth: number): readonly SceneDecor[] {
  const left = -width / 2;
  const right = width / 2;
  const back = -depth / 2;
  const front = depth / 2;
  const item = (kind: SceneDecor['kind'], x: number, z: number, rotationY = 0): SceneDecor =>
    Object.freeze({ kind, position: point(x, 0, z), rotationY });

  return Object.freeze([
    item('bookcase', left + width * 0.24, back + 0.24),
    item('bookcase', left + width * 0.76, back + 0.24),
    item('bookcase', left + 0.24, back + depth * 0.4, Math.PI / 2),
    item('plant', left + 0.38, back + 0.38),
    item('plant', right - 0.34, front - 0.34),
    item('plant', left + 0.34, front - 0.34),
    item('lamp', right - 0.32, back + 0.34),
    item('lamp', left + 0.32, back + depth * 0.72),
  ]);
}

/**
 * Deterministic, immutable arrangement of the roster: one rug zone per team in a compact grid,
 * the executive zone first. Only identity fields matter, so activity updates never move desks.
 */
export function buildOfficeLayout(
  members: readonly SceneMember[],
  teams: readonly SceneTeam[] = [],
): OfficeLayout {
  if (members.length > MAX_MEMBERS) {
    throw new RangeError(`Office layout supports at most ${MAX_MEMBERS} members.`);
  }
  const ids = new Set<string>();
  for (const member of members) {
    if (ids.has(member.id)) throw new TypeError(`Duplicate scene member id: ${member.id}`);
    ids.add(member.id);
  }

  const drafts = draftZones(members, teams);
  const gridColumns = zoneColumns(drafts.length);
  const gridRows = Math.ceil(drafts.length / gridColumns);
  const columnWidths = Array.from({ length: Math.min(gridColumns, drafts.length) }, (_, column) =>
    Math.max(...drafts.filter((_, i) => i % gridColumns === column).map((zone) => zone.width)),
  );
  const rowDepths = Array.from({ length: gridRows }, (_, row) =>
    Math.max(
      ...drafts.slice(row * gridColumns, (row + 1) * gridColumns).map((zone) => zone.depth),
    ),
  );
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
  const contentWidth = sum(columnWidths) + Math.max(0, columnWidths.length - 1) * ZONE_GAP;
  const contentDepth = sum(rowDepths) + Math.max(0, rowDepths.length - 1) * ZONE_GAP;
  const width = Math.max(MIN_FLOOR_WIDTH, contentWidth + SIDE_MARGIN * 2);
  const depth = Math.max(MIN_FLOOR_DEPTH, contentDepth + BACK_MARGIN + FRONT_MARGIN);

  const originX = -contentWidth / 2;
  const originZ = -depth / 2 + BACK_MARGIN + (depth - BACK_MARGIN - FRONT_MARGIN - contentDepth) / 2;

  const zones: SceneZone[] = [];
  const placements: ScenePlacement[] = [];
  drafts.forEach((draft, index) => {
    const column = index % gridColumns;
    const row = Math.floor(index / gridColumns);
    const zoneWidth = columnWidths[column] ?? draft.width;
    const zoneDepth = rowDepths[row] ?? draft.depth;
    const x0 = originX + sum(columnWidths.slice(0, column)) + column * ZONE_GAP;
    const z0 = originZ + sum(rowDepths.slice(0, row)) + row * ZONE_GAP;
    const centerX = x0 + zoneWidth / 2;

    zones.push(
      Object.freeze({
        teamId: draft.team.id,
        teamName: draft.team.name,
        color: draft.team.color,
        kind: draft.team.kind,
        center: point(centerX, 0, z0 + zoneDepth / 2),
        width: zoneWidth,
        depth: zoneDepth,
        // Front-right corner of the rug: clear of the nameplates floating above the desks.
        labelPosition: point(x0 + zoneWidth - 0.62, 0.05, z0 + zoneDepth - 0.16),
      }),
    );

    draft.members.forEach((member, memberIndex) => {
      const stationColumn = memberIndex % draft.columns;
      const stationRow = Math.floor(memberIndex / draft.columns);
      // The station footprint extends left (standing spot) and forward (chair) of the desk.
      const desk = point(
        centerX + (stationColumn - (draft.columns - 1) / 2) * STATION_PITCH_X + 0.2,
        0,
        z0 + ZONE_BACK_PADDING + stationRow * STATION_PITCH_Z + 0.56,
      );
      placements.push(
        Object.freeze({
          member: Object.freeze({
            id: member.id,
            displayName: member.displayName,
            role: member.role,
            teamId: member.teamId,
            teamName: member.teamName,
            provider: member.provider,
            avatarColor: member.avatarColor,
          }),
          position: add(desk, STAND_OFFSET),
          deskPosition: desk,
          chairPosition: add(desk, CHAIR_OFFSET),
          // Columns further right already sit lower on screen; lifting the left ones widens that gap.
          labelLift: Math.min(0.6, (draft.columns - 1 - stationColumn) * 0.36),
        }),
      );
    });
  });

  return Object.freeze({
    members: Object.freeze(placements),
    zones: Object.freeze(zones),
    decor: buildDecor(width, depth),
    floor: Object.freeze({ width, depth, center: point(0, 0, 0) }),
    wallHeight: WALL_HEIGHT,
  });
}

/** Stable key of everything that affects geometry, for memoising across snapshot refreshes. */
export function getLayoutSignature(
  members: readonly SceneMember[],
  teams: readonly SceneTeam[] = [],
): string {
  return JSON.stringify([
    members.map((m) => [
      m.id,
      m.displayName,
      m.role,
      m.teamId,
      m.teamName,
      m.provider,
      m.avatarColor,
    ]),
    teams.map((t) => [t.id, t.name, t.kind, t.color, t.sortOrder]),
  ]);
}
