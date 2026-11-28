import type { AgentActivity } from '@agents-office-app/domain';

/**
 * `all`: every nameplate. `focus`: only the selected agent and agents the office is running or that
 * need attention. External CLI activity is already shown by its teal glow.
 */
export type LabelMode = 'all' | 'focus';

export function shouldShowMemberLabel(
  mode: LabelMode,
  memberId: string,
  selectedId: string | null,
  activity: AgentActivity,
): boolean {
  return (
    mode === 'all' ||
    memberId === selectedId ||
    (activity !== 'idle' && activity !== 'external')
  );
}

/** Compact viewports start decluttered; the full office shows everyone. */
export function defaultLabelMode(compact: boolean): LabelMode {
  return compact ? 'focus' : 'all';
}
