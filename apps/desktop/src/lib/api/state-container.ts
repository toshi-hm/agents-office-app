import type { OfficeSnapshot } from '@agents-office-app/domain';
import { INITIAL_OFFICE_STATE } from './store-state.ts';
import type { OfficeState } from './store-state.ts';

/** The observable office state, shaped for React's `useSyncExternalStore`. */
export function createStateContainer() {
  let state: OfficeState = INITIAL_OFFICE_STATE;
  const listeners = new Set<() => void>();

  function set(patch: Partial<OfficeState>) {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  }

  return {
    getState: () => state,
    set,
    applySnapshot(snapshot: OfficeSnapshot) {
      // A slow REST response must not roll the office back behind a newer stream snapshot.
      if (state.snapshot && snapshot.observedAt < state.snapshot.observedAt) return;
      set({ snapshot, error: null });
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
