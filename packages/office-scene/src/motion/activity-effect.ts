import type { AgentActivity } from '@agents-office-app/domain';

export type ActivityEffect = Readonly<{
  /** Vertical bob added to a seated, working character. */
  bob: number;
  /** -1..1 typing phase for the forearms. */
  typing: number;
  beacon: 'approval' | 'error' | 'external' | null;
  /** 0..1 pulse used for beacon scale and ring opacity. */
  pulse: number;
  screenGlow: number;
}>;

const PULSE_SPEED: Readonly<Record<'approval' | 'error' | 'external', number>> = {
  approval: 5.2,
  error: 3.2,
  external: 1.5,
};

/** Pure description of the status effect at `time` seconds. Reduced motion yields a still frame. */
export function sampleActivityEffect(
  activity: AgentActivity,
  time: number,
  reducedMotion: boolean,
  phase = 0,
): ActivityEffect {
  const working = activity === 'working';
  const beacon =
    activity === 'waiting_approval'
      ? 'approval'
      : activity === 'error'
        ? 'error'
        : activity === 'external'
          ? 'external'
          : null;
  const animate = !reducedMotion;
  const pulse =
    beacon === null
      ? 0
      : animate
        ? 0.5 + 0.5 * Math.sin(time * PULSE_SPEED[beacon] + phase)
        : 0.75;
  return {
    bob: working && animate ? Math.sin(time * 4.1 + phase) * 0.012 : 0,
    typing: working && animate ? Math.sin(time * 13 + phase) : 0,
    beacon,
    pulse,
    screenGlow: working ? 1 : activity === 'external' ? 0.7 : activity === 'starting' ? 0.4 : 0,
  };
}
