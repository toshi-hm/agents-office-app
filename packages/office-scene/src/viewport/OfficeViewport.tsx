import type { CameraMode } from '../camera/plan-goal.ts';
import { buildOfficeLayout } from '../layout/build-layout.ts';
import { getDestination } from '../motion/seating-rules.ts';
import { useMotionPreference } from '../use-motion-preference.ts';
import { supportsWebGL2 } from '../webgl.ts';
import { OfficeFallback } from './OfficeFallback.tsx';
import { SceneCanvasSlot } from './SceneCanvasSlot.tsx';
import { useCameraState } from './use-camera-state.ts';
import { useLabelMode } from './use-label-mode.ts';
import { useOfficeLayout } from './use-office-layout.ts';
import { useSceneRecovery } from './use-scene-recovery.ts';
import { ViewportControls } from './ViewportControls.tsx';
import { NO_ACTIVITIES, NO_TEAMS } from './viewport-props.ts';
import type { OfficeViewportProps } from './viewport-props.ts';
import '../styles/index.css';

export type { OfficeViewportProps } from './viewport-props.ts';

/** The interactive 3D office. It falls back to a selectable list whenever WebGL is unavailable. */
export function OfficeViewport(props: OfficeViewportProps) {
  const { members, teams = NO_TEAMS, activities = NO_ACTIVITIES, selectedId } = props;
  const { onSelect, compact = false, theme = 'light', graphicsEnabled = true } = props;
  const layout = useOfficeLayout(members, teams);
  const recovery = useSceneRecovery();
  const canRender = graphicsEnabled && supportsWebGL2();
  const [labelMode, changeLabelMode] = useLabelMode(
    props.labelMode,
    compact,
    props.onLabelModeChange,
  );
  const motion = useMotionPreference();
  const camera = useCameraState(selectedId, onSelect);
  const { moveCamera, select } = camera;

  const selected = layout?.members.find(({ member }) => member.id === selectedId) ?? null;
  const focusPoint = selected
    ? getDestination(selected, activities[selected.member.id] ?? 'idle')
    : null;
  const mode: CameraMode = camera.mode === 'follow' && !selected ? 'overview' : camera.mode;
  const fallbackReason = !layout
    ? 'layout'
    : !canRender
      ? 'unsupported'
      : recovery.failed
        ? 'failed'
        : null;
  const shared = { activities, selectedId, onSelect: select, compact };

  return (
    <div
      className="ao-viewport"
      data-compact={compact}
      data-theme-variant={theme}
      data-camera-mode={mode}
      data-reduced-motion={motion.reducedMotion}
    >
      {fallbackReason !== null || !layout ? (
        <OfficeFallback
          {...shared}
          layout={layout ?? buildOfficeLayout([], teams)}
          reason={fallbackReason ?? 'layout'}
          onRetry={fallbackReason === 'failed' ? recovery.retry : undefined}
        />
      ) : (
        <SceneCanvasSlot
          {...shared}
          recovery={recovery}
          layout={layout}
          labelMode={labelMode}
          reducedMotion={motion.reducedMotion}
          theme={theme}
          mode={mode}
          focusPoint={focusPoint}
          sequence={camera.sequence}
          onManual={() => moveCamera('manual')}
          onBackgroundClick={() => {
            if (selectedId) onSelect(null);
            else moveCamera('overview');
          }}
        />
      )}

      {!compact && fallbackReason === null && (
        <ViewportControls
          mode={mode}
          followed={selected?.member ?? null}
          labelMode={labelMode}
          reducedMotion={motion.reducedMotion}
          onCamera={moveCamera}
          onLabelMode={changeLabelMode}
          onReducedMotion={(reduce) => motion.setPreference(reduce ? 'reduce' : 'normal')}
        />
      )}
    </div>
  );
}
