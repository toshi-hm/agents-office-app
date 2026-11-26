import { useCallback, useEffect, useState } from 'react';
import type { WindowMode } from '@agents-office-app/domain';
import type { TauriBridge } from '../lib/tauri/types.ts';
import type { RunAction } from './useActionRunner.ts';

/** Full or mini window, and whether each one floats above other windows. */
export function useWindowMode({
  bridge,
  run,
  fail,
  closeModal,
}: {
  bridge: TauriBridge;
  run: RunAction;
  fail: (error: unknown) => void;
  closeModal: () => void;
}) {
  const [mode, setMode] = useState<WindowMode>('full');
  // The mini office floats above other windows by default; the full window does not.
  const [pins, setPins] = useState<Readonly<Record<WindowMode, boolean>>>({
    full: false,
    mini: true,
  });
  const pinned = pins[mode];
  const togglePin = () => setPins((current) => ({ ...current, [mode]: !current[mode] }));

  /** Switches the window, then runs `after` once the shell has resized it. */
  const changeMode = useCallback(
    (next: WindowMode, after: () => void) => {
      void run('window-mode', async () => {
        setMode(await bridge.setWindowMode(next));
        after();
      });
    },
    [bridge, run],
  );

  // The shell changes always-on-top on its own when resizing, so re-assert the chosen value.
  useEffect(() => {
    bridge.setAlwaysOnTop(pinned).catch(fail);
  }, [bridge, fail, mode, pinned]);

  useEffect(
    () =>
      bridge.onWindowModeChanged((next) => {
        setMode(next);
        if (next === 'mini') closeModal();
      }),
    [bridge, closeModal],
  );

  return { mode, pinned, togglePin, changeMode };
}
