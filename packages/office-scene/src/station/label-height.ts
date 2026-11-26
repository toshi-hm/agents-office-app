import type { ActivityEffect } from '../motion/activity-effect.ts';

export const isAlert = (beacon: ActivityEffect['beacon']): beacon is 'approval' | 'error' =>
  beacon === 'approval' || beacon === 'error';

/** Alerts raise the nameplate so that it never covers the beacon underneath. */
export function getLabelHeight(seated: boolean, labelLift: number, alerting: boolean): number {
  return (seated ? 1.92 : 2.04) + labelLift + (alerting ? 0.28 : 0);
}
