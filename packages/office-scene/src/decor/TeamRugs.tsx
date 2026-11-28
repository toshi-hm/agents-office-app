import type { SceneZone } from '../types.ts';
import type { Palette } from './palettes.ts';
import { ZoneRug } from './ZoneRug.tsx';

export function TeamRugs({ zones, palette }: { zones: readonly SceneZone[]; palette: Palette }) {
  return (
    <>
      {zones.map((zone) => (
        <ZoneRug key={zone.teamId} zone={zone} palette={palette} />
      ))}
    </>
  );
}
