import { FittedAsset } from '../FittedAsset.tsx';
import { SCENE_ASSET_URLS } from '../asset-manifest.ts';
import type { ScenePlacement } from '../types.ts';
import { CHAIR_WIDTH, DESK_HEIGHT_RATIO, DESK_WIDTH, PRESIDENT_DESK_WIDTH } from './constants.ts';
import { DesktopComputer } from './DesktopComputer.tsx';
import { PresidentLaptop } from './PresidentLaptop.tsx';

/** Desk, chair and computer. The president gets a wider desk and a laptop. */
export function DeskSetup({
  placement,
  screenGlow,
}: {
  placement: ScenePlacement;
  screenGlow: number;
}) {
  const { member, deskPosition, chairPosition } = placement;
  const president = member.role === 'president';
  const deskWidth = president ? PRESIDENT_DESK_WIDTH : DESK_WIDTH;
  const deskTop = deskWidth * DESK_HEIGHT_RATIO;
  const [deskX, , deskZ] = deskPosition;
  const Computer = president ? PresidentLaptop : DesktopComputer;
  return (
    <>
      <FittedAsset url={SCENE_ASSET_URLS.desk} width={deskWidth} position={deskPosition} />
      <FittedAsset
        url={SCENE_ASSET_URLS.chair}
        width={CHAIR_WIDTH}
        position={chairPosition}
        rotationY={Math.PI}
      />
      <Computer deskX={deskX} deskTop={deskTop} deskZ={deskZ} screenGlow={screenGlow} />
    </>
  );
}
