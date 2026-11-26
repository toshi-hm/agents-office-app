import type { SlotAcquireResult, SlotLedger } from './types.ts';

export function acquireSlot(
  ledger: SlotLedger,
  input: Readonly<{ executionId: string; agentId: string; taskId: string }>,
): SlotAcquireResult {
  if (ledger.slots.some((slot) => slot.executionId === input.executionId)) {
    return Object.freeze({ ok: false, code: 'duplicate_execution', ledger });
  }
  if (ledger.slots.some((slot) => slot.state === 'occupied' && slot.agentId === input.agentId)) {
    return Object.freeze({ ok: false, code: 'agent_busy', ledger });
  }
  const freeSlot = ledger.slots.find((slot) => slot.state === 'free');
  if (!freeSlot) {
    return Object.freeze({ ok: false, code: 'no_free_slot', ledger });
  }
  const nextSlots = ledger.slots.map((slot) =>
    slot.slotNo === freeSlot.slotNo
      ? Object.freeze({
          slotNo: slot.slotNo,
          state: 'occupied' as const,
          executionId: input.executionId,
          agentId: input.agentId,
          taskId: input.taskId,
        })
      : slot,
  );
  return Object.freeze({
    ok: true,
    slotNo: freeSlot.slotNo,
    ledger: Object.freeze({ slots: Object.freeze(nextSlots) }),
  });
}
