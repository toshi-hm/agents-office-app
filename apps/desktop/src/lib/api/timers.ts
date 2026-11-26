export type Timers = Readonly<{
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
}>;

export const defaultTimers: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** Runs `task` once, `ms` after the first `schedule` call since the last run or cancel. */
export function createCoalescedTask(timers: Timers, ms: number, task: () => void) {
  let handle: unknown = null;
  return {
    schedule() {
      if (handle !== null) return;
      handle = timers.set(() => {
        handle = null;
        task();
      }, ms);
    },
    cancel() {
      if (handle !== null) timers.clear(handle);
      handle = null;
    },
  };
}

/** A single re-armable timeout: arming again replaces the pending callback. */
export function createDeadline(timers: Timers) {
  let handle: unknown = null;
  const cancel = () => {
    if (handle !== null) timers.clear(handle);
    handle = null;
  };
  return {
    cancel,
    arm(callback: () => void, ms: number) {
      cancel();
      handle = timers.set(() => {
        handle = null;
        callback();
      }, ms);
    },
  };
}
