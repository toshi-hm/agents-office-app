import { useState } from 'react';
import { describeError } from '../lib/tauri/describe-error.ts';

/** Submission state shared by the form dialogs: one request at a time, errors shown inline. */
export function useDialogForm(onPickDirectory: (current: string) => Promise<string | null>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Stays busy after success: the caller closes the dialog. */
  const submit = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(describeError(failure));
      setBusy(false);
    }
  };

  const browse = (current: string, apply: (picked: string) => void) =>
    void onPickDirectory(current).then(
      (picked) => {
        if (picked) apply(picked);
      },
      (failure: unknown) => setError(describeError(failure)),
    );

  return { busy, error, submit, browse };
}
