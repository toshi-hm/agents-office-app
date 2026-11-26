import { useEffect, useMemo } from 'react';
import { SCENE_ASSET_URLS } from '../asset-manifest.ts';
import { prepareMemberPose } from '../motion/prepare-pose.ts';
import { prepareCharacter } from '../model/prepare-character.ts';
import { useSceneGLTF } from '../scene-gltf.ts';

/** An owned, tinted character model and its pose controller. Suspends while loading. */
export function useCharacter(avatarColor: string) {
  const { scene, animations } = useSceneGLTF(SCENE_ASSET_URLS.character);
  const prepared = useMemo(
    () =>
      prepareCharacter(
        scene,
        animations.find((clip) => clip.name.toLowerCase() === 'idle'),
        avatarColor,
      ),
    [scene, animations, avatarColor],
  );
  const pose = useMemo(() => prepareMemberPose(prepared.model), [prepared]);
  useEffect(() => () => prepared.dispose(), [prepared]);
  return { model: prepared.model, pose };
}
