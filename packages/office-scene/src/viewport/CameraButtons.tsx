import type { CameraMode } from '../camera/plan-goal.ts';
import type { SceneMember } from '../types.ts';

export function CameraButtons({
  mode,
  followed,
  onCamera,
}: {
  mode: CameraMode;
  followed: SceneMember | null;
  onCamera: (mode: CameraMode) => void;
}) {
  return (
    <>
      <button type="button" aria-pressed={mode === 'overview'} onClick={() => onCamera('overview')}>
        全体
      </button>
      <button
        type="button"
        aria-pressed={mode === 'follow'}
        disabled={!followed}
        title={followed ? `${followed.displayName}を追従` : '社員を選ぶと追従できます'}
        onClick={() => onCamera(mode === 'follow' ? 'manual' : 'follow')}
      >
        追従
      </button>
    </>
  );
}
