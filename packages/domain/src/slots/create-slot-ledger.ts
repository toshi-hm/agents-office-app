import { SLOT_COUNT, type SlotEntry, type SlotLedger } from './types.ts';

export function createSlotLedger(): SlotLedger {
  const slots: SlotEntry[] = Array.from({ length: SLOT_COUNT }, (_, i) =>
    Object.freeze({
      slotNo: i + 1,
      state: 'free' as const,
      executionId: null,
      agentId: null,
      taskId: null,
    }),
  );
  return Object.freeze({ slots: Object.freeze(slots) });
}
