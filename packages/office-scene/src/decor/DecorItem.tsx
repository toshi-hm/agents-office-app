import { FittedAsset } from '../FittedAsset.tsx';
import { SCENE_ASSET_URLS } from '../asset-manifest.ts';
import type { SceneDecor } from '../types.ts';
import { DeskLamp } from './DeskLamp.tsx';
import type { Palette } from './palettes.ts';
import { PottedPlant } from './PottedPlant.tsx';

export function DecorItem({
  item,
  index,
  palette,
}: {
  item: SceneDecor;
  index: number;
  palette: Palette;
}) {
  if (item.kind === 'plant') return <PottedPlant position={item.position} seed={index + 1} />;
  if (item.kind === 'lamp') return <DeskLamp position={item.position} glow={palette.lampGlow} />;
  return (
    <FittedAsset
      url={SCENE_ASSET_URLS.bookcase}
      width={0.8}
      position={item.position}
      rotationY={item.rotationY}
      name="office-bookcase"
    />
  );
}
