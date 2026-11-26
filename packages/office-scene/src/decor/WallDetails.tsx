import type { OfficeLayout } from '../types.ts';
import type { Palette } from './palettes.ts';
import { WallPicture } from './WallPicture.tsx';
import { WallWindow } from './WallWindow.tsx';

/** Depth offset along the left wall (as a fraction of the floor) and picture colour. */
const PICTURES = [
  [0.08, '#9cb38f'],
  [0.26, '#e0a77a'],
] as const;

/** Windows on the back wall and framed pictures on the left wall. */
export function WallDetails({ layout, palette }: { layout: OfficeLayout; palette: Palette }) {
  const { width, depth } = layout.floor;
  const back = -depth / 2;
  const left = -width / 2;
  const windows = width > 8.5 ? [-width * 0.015 - 0.9, width * 0.015 + 0.9] : [0];
  return (
    <group name="wall-details">
      {windows.map((x) => (
        <WallWindow key={x} position={[x, 0.72, back + 0.006]} palette={palette} />
      ))}
      {PICTURES.map(([offset, color]) => (
        <WallPicture
          key={color}
          position={[left + 0.006, 0.78, depth * offset]}
          frameColor={palette.wallTrim}
          color={color}
        />
      ))}
    </group>
  );
}
