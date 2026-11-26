import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OfficeCamera } from './OfficeCamera.tsx';
import type { OfficeCameraProps } from './OfficeCamera.tsx';
import { OfficeScene, preloadSceneAssets } from './OfficeScene.tsx';
import type { OfficeSceneProps } from './OfficeScene.tsx';
import { CAMERA_FOV } from './camera-math.ts';

export { clearSceneAssets } from './OfficeScene.tsx';

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
  const lost = useRef(onContextLost);
  lost.current = onContextLost;
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvas) return;
    const handle = (event: Event) => {
      event.preventDefault();
      lost.current();
    };
    canvas.addEventListener('webglcontextlost', handle);
    return () => canvas.removeEventListener('webglcontextlost', handle);
  }, [canvas]);

  return (
    <div className="ao-viewport__canvas" data-scene-phase={ready ? 'ready' : 'loading'}>
      {!ready && (
        <p className="ao-viewport__loading" role="status">
          オフィスを準備しています…
        </p>
      )}
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
