import type { OfficeLayout } from '../types.ts';
import { DecorItem } from './DecorItem.tsx';
import { FloorAndWalls } from './FloorAndWalls.tsx';
import { ROOM_PALETTES } from './palettes.ts';
import type { SceneTheme } from './palettes.ts';
import { TeamRugs } from './TeamRugs.tsx';
import { WallDetails } from './WallDetails.tsx';

/** The miniature box: plank floor on a thick base, two low walls, rugs and accents. */
export function RoomDecor({ layout, theme }: { layout: OfficeLayout; theme: SceneTheme }) {
  const palette = ROOM_PALETTES[theme];
  return (
    <group name="office-room">
      <FloorAndWalls layout={layout} palette={palette} />
      <WallDetails layout={layout} palette={palette} />
      <TeamRugs zones={layout.zones} palette={palette} />
      {layout.decor.map((item, index) => (
        <DecorItem key={`${item.kind}-${index}`} item={item} index={index} palette={palette} />
      ))}
    </group>
  );
}
