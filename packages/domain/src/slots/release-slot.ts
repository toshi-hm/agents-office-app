import type { SlotLedger } from './types.ts';

export function releaseSlot(ledger: SlotLedger, executionId: string): SlotLedger {
  if (!ledger.slots.some((slot) => slot.executionId === executionId)) {
    return ledger;
  }
  const nextSlots = ledger.slots.map((slot) =>
    slot.executionId === executionId
      ? Object.freeze({
          slotNo: slot.slotNo,
          state: 'free' as const,
          executionId: null,
          agentId: null,
          taskId: null,
        })
      : slot,
  );
  return Object.freeze({ slots: Object.freeze(nextSlots) });
}
