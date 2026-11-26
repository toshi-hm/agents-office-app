import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { OfficeFallback } from './OfficeFallback.tsx';
import type { CameraMode } from './OfficeCamera.tsx';
import type { SceneTheme } from './RoomDecor.tsx';
import { buildOfficeLayout, getLayoutSignature } from './layout.ts';
import { getDestination } from './member-motion.ts';
import { defaultLabelMode } from './scene-labels.ts';
import type { LabelMode } from './scene-labels.ts';
import type { OfficeLayout, SceneActivities, SceneMember, SceneTeam } from './types.ts';
import { useMotionPreference } from './use-motion-preference.ts';
import { supportsWebGL2 } from './webgl.ts';
import './office-viewport.css';

const NO_ACTIVITIES: SceneActivities = Object.freeze({});
const NO_TEAMS: readonly SceneTeam[] = Object.freeze([]);

export type OfficeViewportProps = Readonly<{
  members: readonly SceneMember[];
  teams?: readonly SceneTeam[] | undefined;
  activities?: SceneActivities | undefined;
  selectedId: string | null;
  /** `null` means the selection was cleared by clicking empty floor. */
  onSelect: (id: string | null) => void;
  /** Mini Office: full-bleed diorama with tighter framing and no floating controls. */
  compact?: boolean | undefined;
  theme?: SceneTheme | undefined;
  /** Controlled nameplate mode. Defaults to all (full) or selected/active only (compact). */
  labelMode?: LabelMode | undefined;
  onLabelModeChange?: ((mode: LabelMode) => void) | undefined;
  graphicsEnabled?: boolean | undefined;
}>;

const loadCanvas = () => import('./OfficeCanvas.tsx');

class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.error('[office-scene]', error);
    this.props.onFailure();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** The interactive 3D office. It falls back to a selectable list whenever WebGL is unavailable. */
export function OfficeViewport({
  members,
  teams = NO_TEAMS,
  activities = NO_ACTIVITIES,
  selectedId,
  onSelect,
  compact = false,
  theme = 'light',
  labelMode,
  onLabelModeChange,
  graphicsEnabled = true,
}: OfficeViewportProps) {
  // Snapshots arrive constantly; only identity changes may rebuild the room.
  const signature = getLayoutSignature(members, teams);
  const layout = useMemo<OfficeLayout | null>(() => {
    try {
      return buildOfficeLayout(members, teams);
    } catch (error) {
      console.error('[office-scene]', error);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const canRender = graphicsEnabled && supportsWebGL2();
  // A fresh lazy component per attempt, so a failed chunk or model load can be retried.
  const LazyCanvas = useMemo(() => lazy(loadCanvas), [attempt]);

  const [ownLabelMode, setOwnLabelMode] = useState<LabelMode | null>(null);
  const effectiveLabelMode = labelMode ?? ownLabelMode ?? defaultLabelMode(compact);
  const motion = useMotionPreference();

  const selected = layout?.members.find(({ member }) => member.id === selectedId) ?? null;
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

  const focusPoint = selected
    ? getDestination(selected, activities[selected.member.id] ?? 'idle')
    : null;
  const mode: CameraMode = camera.mode === 'follow' && !selected ? 'overview' : camera.mode;

  const changeLabelMode = (next: LabelMode) => {
    setOwnLabelMode(next);
    onLabelModeChange?.(next);
  };

  const fallbackReason = !layout ? 'layout' : !canRender ? 'unsupported' : failed ? 'failed' : null;

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
          layout={layout ?? buildOfficeLayout([], teams)}
          activities={activities}
          selectedId={selectedId}
          onSelect={select}
          compact={compact}
          reason={fallbackReason ?? 'layout'}
          onRetry={
            fallbackReason === 'failed'
              ? () => {
                  // Drop the cached failure first, or the new canvas would rethrow it at once.
                  void loadCanvas().then(
                    (canvas) => {
                      canvas.clearSceneAssets();
                      setAttempt((value) => value + 1);
                      setFailed(false);
                    },
                    (error: unknown) => console.error('[office-scene]', error),
                  );
                }
              : undefined
          }
        />
      ) : (
        <SceneBoundary key={attempt} onFailure={() => setFailed(true)}>
          <Suspense
            fallback={
              <p className="ao-viewport__loading" role="status">
                オフィスを準備しています…
              </p>
            }
          >
            <LazyCanvas
              layout={layout}
              activities={activities}
              selectedId={selectedId}
              onSelect={select}
              labelMode={effectiveLabelMode}
              compact={compact}
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
              onContextLost={() => setFailed(true)}
            />
          </Suspense>
        </SceneBoundary>
      )}

      {!compact && fallbackReason === null && (
        <div className="ao-viewport__controls" role="toolbar" aria-label="オフィスの表示操作">
          <button
            type="button"
            aria-pressed={mode === 'overview'}
            onClick={() => moveCamera('overview')}
          >
            全体
          </button>
          <button
            type="button"
            aria-pressed={mode === 'follow'}
            disabled={!selected}
            title={selected ? `${selected.member.displayName}を追従` : '社員を選ぶと追従できます'}
            onClick={() => moveCamera(mode === 'follow' ? 'manual' : 'follow')}
          >
            追従
          </button>
          <span className="ao-viewport__divider" aria-hidden="true" />
          <button
            type="button"
            aria-pressed={effectiveLabelMode === 'all'}
            title="オフにすると、選択中・作業中・要対応の社員の名札だけを表示します"
            onClick={() => changeLabelMode(effectiveLabelMode === 'all' ? 'focus' : 'all')}
          >
            名札をすべて表示
          </button>
          <button
            type="button"
            aria-pressed={motion.reducedMotion}
            onClick={() => motion.setPreference(motion.reducedMotion ? 'normal' : 'reduce')}
          >
            動きを減らす
          </button>
        </div>
      )}
    </div>
  );
}
