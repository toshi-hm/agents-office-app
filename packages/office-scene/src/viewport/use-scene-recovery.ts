import { lazy, useMemo, useState } from 'react';

// Dynamic import: three.js stays in its own chunk until the office is really drawn.
const loadCanvas = () => import('./OfficeCanvas.tsx');

/** The lazily loaded canvas, whether it failed, and how to try again. */
export function useSceneRecovery() {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  // A fresh lazy component per attempt, so a failed chunk or model load can be retried.
  const LazyCanvas = useMemo(() => lazy(loadCanvas), [attempt]);

  const retry = () => {
    // Drop the cached failure first, or the new canvas would rethrow it at once.
    void loadCanvas().then(
      (canvas) => {
        canvas.clearSceneAssets();
        setAttempt((value) => value + 1);
        setFailed(false);
      },
      (error: unknown) => console.error('[office-scene]', error),
    );
  };

  return { attempt, failed, markFailed: () => setFailed(true), retry, LazyCanvas };
}

export type SceneRecovery = ReturnType<typeof useSceneRecovery>;
