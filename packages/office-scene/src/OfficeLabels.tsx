import { Html } from '@react-three/drei';
import { Nameplate } from './Nameplate.tsx';
import type { NameplateProps } from './Nameplate.tsx';
import type { ScenePosition, SceneZone } from './types.ts';

/** Floating team signs, anchored to a front corner of each rug. */
export function TeamLabels({
  zones,
  compact,
  visible,
}: {
  zones: readonly SceneZone[];
  compact: boolean;
  visible: boolean;
}) {
  return (
    <group name="team-labels">
      {zones.map((zone) => (
        <Html
          key={zone.teamId}
          position={[...zone.labelPosition]}
          center
          zIndexRange={[4, 1]}
          wrapperClass="ao-label-layer"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="ao-team-label"
            data-compact={compact}
            hidden={!visible}
            data-scene-label="team"
            aria-hidden="true"
          >
            <span className="ao-team-label__dot" style={{ background: zone.color }} />
            {zone.teamName}
          </div>
        </Html>
      ))}
    </group>
  );
}

/**
 * Hidden rather than unmounted: drei tears its DOM root down synchronously, which React reports as
 * an error when it happens during a render.
 */
export function MemberLabel({
  position,
  visible,
  ...props
}: NameplateProps & { position: ScenePosition; visible: boolean }) {
  return (
    <Html
      position={[...position]}
      center
      zIndexRange={props.selected ? [30, 22] : [20, 6]}
      wrapperClass="ao-label-layer"
      style={{ pointerEvents: 'none' }}
    >
      <div hidden={!visible}>
        <Nameplate {...props} />
      </div>
    </Html>
  );
}
