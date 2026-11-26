import type { CameraMode } from '../camera/plan-goal.ts';
import type { LabelMode } from '../scene-labels.ts';
import type { SceneMember } from '../types.ts';
import { CameraButtons } from './CameraButtons.tsx';

/** Floating toolbar of the full office: camera, nameplates and motion. */
export function ViewportControls({
  mode,
  followed,
  labelMode,
  reducedMotion,
  onCamera,
  onLabelMode,
  onReducedMotion,
}: {
  mode: CameraMode;
  /** The selected member the camera can follow. */
  followed: SceneMember | null;
  labelMode: LabelMode;
  reducedMotion: boolean;
  onCamera: (mode: CameraMode) => void;
  onLabelMode: (mode: LabelMode) => void;
  onReducedMotion: (reduce: boolean) => void;
}) {
  return (
    <div className="ao-viewport__controls" role="toolbar" aria-label="オフィスの表示操作">
      <CameraButtons mode={mode} followed={followed} onCamera={onCamera} />
      <span className="ao-viewport__divider" aria-hidden="true" />
      <button
        type="button"
        aria-pressed={labelMode === 'all'}
        title="オフにすると、選択中・作業中・要対応の社員の名札だけを表示します"
        onClick={() => onLabelMode(labelMode === 'all' ? 'focus' : 'all')}
      >
        名札をすべて表示
      </button>
      <button
        type="button"
        aria-pressed={reducedMotion}
        onClick={() => onReducedMotion(!reducedMotion)}
      >
        動きを減らす
      </button>
    </div>
  );
}
