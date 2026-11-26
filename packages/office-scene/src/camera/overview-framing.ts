import type { OfficeLayout, ScenePosition } from '../types.ts';
import { COMPACT_PADDING, FULL_PADDING, LABEL_HEIGHT } from './constants.ts';
import { fitView } from './fit-view.ts';
import type { CameraView } from './vector-math.ts';

/** The outline that must stay visible: floor slab, wall tops and every nameplate anchor. */
export function getFramingPoints(layout: OfficeLayout): readonly ScenePosition[] {
  const halfWidth = layout.floor.width / 2;
  const halfDepth = layout.floor.depth / 2;
  const [cx, cy, cz] = layout.floor.center;
  const corners: ScenePosition[] = [];
  for (const x of [-halfWidth, halfWidth]) {
    for (const z of [-halfDepth, halfDepth]) corners.push([cx + x, cy - 0.28, cz + z]);
  }
  corners.push(
    [cx - halfWidth, layout.wallHeight, cz - halfDepth],
    [cx + halfWidth, layout.wallHeight, cz - halfDepth],
    [cx - halfWidth, layout.wallHeight, cz + halfDepth],
  );
  for (const { position, chairPosition, labelLift } of layout.members) {
    corners.push(
      [position[0], LABEL_HEIGHT + labelLift, position[2]],
      [chairPosition[0], LABEL_HEIGHT + labelLift, chairPosition[2]],
    );
  }
  return corners;
}

export function getOverviewView(layout: OfficeLayout, aspect: number, compact = false): CameraView {
  return fitView(getFramingPoints(layout), aspect, compact ? COMPACT_PADDING : FULL_PADDING);
}

export function getMaxDistance(layout: OfficeLayout, aspect: number): number {
  return Math.max(20, getOverviewView(layout, aspect).distance * 1.4);
}
