import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraMode } from '../camera/plan-goal.ts';

/** The requested camera mode, following selections made anywhere in the app. */
export function useCameraState(selectedId: string | null, onSelect: (id: string | null) => void) {
  const [camera, setCamera] = useState<{ mode: CameraMode; sequence: number }>(() => ({
    mode: selectedId ? 'follow' : 'overview',
    sequence: 0,
  }));
  const moveCamera = useCallback((mode: CameraMode) => {
    setCamera((previous) => ({
      mode,
      sequence: mode === 'manual' ? previous.sequence : previous.sequence + 1,
    }));
  }, []);

  // A selection made anywhere (3D, sidebar, inspector) focuses the camera on that agent.
  const previousSelection = useRef(selectedId);
  useEffect(() => {
    if (previousSelection.current === selectedId) return;
    previousSelection.current = selectedId;
    moveCamera(selectedId ? 'follow' : 'overview');
  }, [selectedId, moveCamera]);

  const select = useCallback(
    (id: string) => {
      // Re-clicking the selected agent focuses it again after manual camera movement.
      if (id === selectedId) moveCamera('follow');
      onSelect(id);
    },
    [selectedId, onSelect, moveCamera],
  );

  return { ...camera, moveCamera, select };
}
