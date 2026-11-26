import type { ScenePlacement, SceneZone } from '../types.ts';
import {
  CHAIR_OFFSET,
  STAND_OFFSET,
  STATION_PITCH_X,
  STATION_PITCH_Z,
  ZONE_BACK_PADDING,
} from './constants.ts';
import { add, point } from './geometry.ts';
import type { ZoneBounds } from './zone-bounds.ts';
import type { ZoneDraft } from './zone-drafts.ts';

export function placeZone(draft: ZoneDraft, bounds: ZoneBounds): SceneZone {
  const { x0, z0, width, depth } = bounds;
  return Object.freeze({
    teamId: draft.team.id,
    teamName: draft.team.name,
    color: draft.team.color,
    kind: draft.team.kind,
    center: point(x0 + width / 2, 0, z0 + depth / 2),
    width,
    depth,
    // Front-right corner of the rug: clear of the nameplates floating above the desks.
    labelPosition: point(x0 + width - 0.62, 0.05, z0 + depth - 0.16),
  });
}

/** Desk, chair and standing spot for every member of one zone. */
export function placeStations(draft: ZoneDraft, bounds: ZoneBounds): ScenePlacement[] {
  const centerX = bounds.x0 + bounds.width / 2;
  return draft.members.map((member, memberIndex) => {
    const stationColumn = memberIndex % draft.columns;
    const stationRow = Math.floor(memberIndex / draft.columns);
    // The station footprint extends left (standing spot) and forward (chair) of the desk.
    const desk = point(
      centerX + (stationColumn - (draft.columns - 1) / 2) * STATION_PITCH_X + 0.2,
      0,
      bounds.z0 + ZONE_BACK_PADDING + stationRow * STATION_PITCH_Z + 0.56,
    );
    return Object.freeze({
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
    });
  });
}
