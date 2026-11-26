import type { Group, Mesh, MeshBasicMaterial } from 'three';
import type { ActivityEffect } from '../motion/activity-effect.ts';

/** Pulses the alert beacon floating above `at`; it spins unless motion is reduced. */
export function animateBeacon(
  beacon: Group,
  at: Readonly<{ x: number; z: number }>,
  effect: ActivityEffect,
  time: number,
  reducedMotion: boolean,
): void {
  beacon.position.set(at.x, 1.56 + effect.pulse * 0.05, at.z);
  beacon.scale.setScalar(0.85 + effect.pulse * 0.35);
  if (!reducedMotion) beacon.rotation.y = time * 1.6;
}

export function animatePulseRing(ring: Mesh, effect: ActivityEffect): void {
  ring.scale.setScalar(1 + effect.pulse * 0.28);
  (ring.material as MeshBasicMaterial).opacity = 0.75 - effect.pulse * 0.4;
}
