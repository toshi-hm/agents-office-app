import { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CAMERA_FOV } from '../camera/constants.ts';
import { OfficeCamera } from '../camera/OfficeCamera.tsx';
import type { OfficeCameraProps } from '../camera/OfficeCamera.tsx';
import { OfficeScene } from '../scene/OfficeScene.tsx';
import type { OfficeSceneProps } from '../scene/OfficeScene.tsx';
import { preloadSceneAssets } from '../scene/scene-assets.ts';
import { SceneLoading } from './SceneLoading.tsx';
import { useContextLoss } from './use-context-loss.ts';

export { clearSceneAssets } from '../scene/scene-assets.ts';

export type OfficeCanvasProps = Omit<OfficeSceneProps, 'onReady'> &
  Omit<OfficeCameraProps, 'layout' | 'compact' | 'reducedMotion'> &
  Readonly<{
    onBackgroundClick: () => void;
    onContextLost: () => void;
  }>;

preloadSceneAssets();

/** Loaded lazily so that three.js is only parsed when the office is really drawn. */
export default function OfficeCanvas({
  mode,
  focusPoint,
  sequence,
  onManual,
  onBackgroundClick,
  onContextLost,
  ...scene
}: OfficeCanvasProps) {
  const [ready, setReady] = useState(false);
  const element = useRef<HTMLCanvasElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  useContextLoss(canvas, onContextLost);

  return (
    <div className="ao-viewport__canvas" data-scene-phase={ready ? 'ready' : 'loading'}>
      {!ready && <SceneLoading />}
      <Canvas
        frameloop="demand"
        shadows
        dpr={[1, scene.compact ? 2 : 1.75]}
        camera={{ position: [10, 10, 14], fov: CAMERA_FOV, near: 0.5, far: 400 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          element.current = gl.domElement;
          setCanvas(gl.domElement);
        }}
        onPointerMissed={(event) => {
          // Only a click on the canvas itself counts, not on a floating nameplate.
          if (event.type === 'click' && event.target === element.current) onBackgroundClick();
        }}
      >
        <OfficeCamera
          layout={scene.layout}
          mode={mode}
          focusPoint={focusPoint}
          sequence={sequence}
          compact={scene.compact}
          reducedMotion={scene.reducedMotion}
          onManual={onManual}
        />
        <Suspense fallback={null}>
          <OfficeScene {...scene} onReady={() => setReady(true)} />
        </Suspense>
      </Canvas>
    </div>
  );
}
