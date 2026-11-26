import { FittedAsset } from '../FittedAsset.tsx';
import { SCENE_ASSET_URLS } from '../asset-manifest.ts';
import { KEYBOARD_WIDTH, SCREEN_WIDTH } from './constants.ts';
import { ScreenGlow } from './ScreenGlow.tsx';

export function DesktopComputer({
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
        url={SCENE_ASSET_URLS.screen}
        width={SCREEN_WIDTH}
        position={[deskX, deskTop, deskZ - 0.18]}
      />
      <FittedAsset
        url={SCENE_ASSET_URLS.keyboard}
        width={KEYBOARD_WIDTH}
        position={[deskX, deskTop + 0.004, deskZ + 0.14]}
      />
      {screenGlow > 0 && (
        <ScreenGlow
          position={[deskX, deskTop + 0.23, deskZ - 0.105]}
          size={[0.46, 0.26]}
          strength={screenGlow}
        />
      )}
    </>
  );
}
