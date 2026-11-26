import { useMemo } from 'react';
import { fitClone } from './model-preparation.ts';
import { useSceneGLTF } from './scene-gltf.ts';

export function FittedAsset({
  url,
  width,
  position = [0, 0, 0],
  rotationY = 0,
  name,
}: {
  url: string;
  width: number;
  position?: readonly [number, number, number];
  rotationY?: number;
  name?: string;
}) {
  const { scene } = useSceneGLTF(url);
  const model = useMemo(() => fitClone(scene, width), [scene, width]);
  return (
    <group position={[...position]} rotation={[0, rotationY, 0]} {...(name ? { name } : {})}>
      <primitive object={model} dispose={null} />
    </group>
  );
}
