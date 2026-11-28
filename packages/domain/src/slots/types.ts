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
