import type { OfficeSseEvent } from '@agents-office-app/domain';

export const EVENT_TYPES = [
  'snapshot',
  'log',
  'approval_requested',
  'approval_decided',
  'task_finished',
  'heartbeat',
] as const;

export function parseSseEvent(data: unknown): OfficeSseEvent | null {
  if (typeof data !== 'string') return null;
  try {
    const value = JSON.parse(data) as { type?: unknown } | null;
    if (!value || typeof value !== 'object') return null;
    return (EVENT_TYPES as readonly unknown[]).includes(value.type)
      ? (value as OfficeSseEvent)
      : null;
  } catch {
    return null;
  }
}
