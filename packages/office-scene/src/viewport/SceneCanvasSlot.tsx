import { Suspense } from 'react';
import type { OfficeCanvasProps } from './OfficeCanvas.tsx';
import { SceneErrorBoundary } from './SceneErrorBoundary.tsx';
import { SceneLoading } from './SceneLoading.tsx';
import type { SceneRecovery } from './use-scene-recovery.ts';

/** Loads the canvas behind a loading message and an error boundary. */
export function SceneCanvasSlot({
  recovery: { attempt, markFailed, LazyCanvas },
  ...canvas
}: Omit<OfficeCanvasProps, 'onContextLost'> & { recovery: SceneRecovery }) {
  return (
    <SceneErrorBoundary key={attempt} onFailure={markFailed}>
      <Suspense fallback={<SceneLoading />}>
        <LazyCanvas {...canvas} onContextLost={markFailed} />
      </Suspense>
    </SceneErrorBoundary>
  );
}
