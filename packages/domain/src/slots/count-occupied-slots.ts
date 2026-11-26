import type { SlotLedger } from './types.ts';

export function countOccupiedSlots(ledger: SlotLedger): number {
  return ledger.slots.filter((slot) => slot.state === 'occupied').length;
}
