import {
  BACK_MARGIN,
  FRONT_MARGIN,
  MIN_FLOOR_DEPTH,
  MIN_FLOOR_WIDTH,
  SIDE_MARGIN,
  ZONE_GAP,
} from './constants.ts';
import { sum } from './geometry.ts';
import { gridColumnCount } from './zone-drafts.ts';
import type { ZoneDraft } from './zone-drafts.ts';

/** The rug rectangle of one zone: its left and back edges plus its size. */
export type ZoneBounds = Readonly<{ x0: number; z0: number; width: number; depth: number }>;

/** Arranges the zones in a compact grid and sizes the floor around them. */
export function getZoneBounds(drafts: readonly ZoneDraft[]) {
  const gridColumns = gridColumnCount(drafts.length);
  const gridRows = Math.ceil(drafts.length / gridColumns);
  const columnWidths = Array.from({ length: Math.min(gridColumns, drafts.length) }, (_, column) =>
    Math.max(...drafts.filter((_, i) => i % gridColumns === column).map((zone) => zone.width)),
  );
  const rowDepths = Array.from({ length: gridRows }, (_, row) =>
    Math.max(
      ...drafts.slice(row * gridColumns, (row + 1) * gridColumns).map((zone) => zone.depth),
    ),
  );
  const contentWidth = sum(columnWidths) + Math.max(0, columnWidths.length - 1) * ZONE_GAP;
  const contentDepth = sum(rowDepths) + Math.max(0, rowDepths.length - 1) * ZONE_GAP;
  const width = Math.max(MIN_FLOOR_WIDTH, contentWidth + SIDE_MARGIN * 2);
  const depth = Math.max(MIN_FLOOR_DEPTH, contentDepth + BACK_MARGIN + FRONT_MARGIN);

  const originX = -contentWidth / 2;
  const originZ = -depth / 2 + BACK_MARGIN + (depth - BACK_MARGIN - FRONT_MARGIN - contentDepth) / 2;

  const bounds = drafts.map((draft, index): ZoneBounds => {
    const column = index % gridColumns;
    const row = Math.floor(index / gridColumns);
    return {
      x0: originX + sum(columnWidths.slice(0, column)) + column * ZONE_GAP,
      z0: originZ + sum(rowDepths.slice(0, row)) + row * ZONE_GAP,
      width: columnWidths[column] ?? draft.width,
      depth: rowDepths[row] ?? draft.depth,
    };
  });
  return { floor: { width, depth }, bounds };
}
