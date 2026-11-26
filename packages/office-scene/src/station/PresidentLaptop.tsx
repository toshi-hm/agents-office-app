import { FittedAsset } from '../FittedAsset.tsx';
import { SCENE_ASSET_URLS } from '../asset-manifest.ts';
import { LAPTOP_WIDTH } from './constants.ts';
import { ScreenGlow } from './ScreenGlow.tsx';

export function PresidentLaptop({
  deskX,
  deskTop,
  deskZ,
  screenGlow,
}: {
  deskX: number;
  deskTop: number;
  deskZ: number;
  screenGlow: number;
}) {
  return (
    <>
      <FittedAsset
        url={SCENE_ASSET_URLS.laptop}
        width={LAPTOP_WIDTH}
        position={[deskX, deskTop, deskZ + 0.05]}
      />
      {screenGlow > 0 && (
        <ScreenGlow
          position={[deskX, deskTop + 0.17, deskZ + 0.02]}
          size={[0.36, 0.2]}
          strength={screenGlow}
        />
      )}
    </>
  );
}
