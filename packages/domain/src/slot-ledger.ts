/**
 * 4-slot concurrency ledger adapted from ~/work/agents-office/packages/domain/src/slot-ledger.ts.
 * Pure immutable state transitions ensuring at most 4 concurrent agent executions and at most 1
 * active slot per agent at any time.
 */

export const SLOT_COUNT = 4 as const;

export type SlotState = 'free' | 'occupied';

export type SlotEntry = Readonly<{
  slotNo: number;
  state: SlotState;
  executionId: string | null;
  agentId: string | null;
  taskId: string | null;
}>;

export type SlotLedger = Readonly<{
  slots: readonly SlotEntry[];
}>;

export type SlotAcquireFailureCode = 'no_free_slot' | 'agent_busy' | 'duplicate_execution';

export type SlotAcquireResult =
  | Readonly<{ ok: true; ledger: SlotLedger; slotNo: number }>
  | Readonly<{ ok: false; code: SlotAcquireFailureCode; ledger: SlotLedger }>;

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

export function countOccupiedSlots(ledger: SlotLedger): number {
  return ledger.slots.filter((slot) => slot.state === 'occupied').length;
}
