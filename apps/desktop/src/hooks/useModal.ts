import { useCallback, useState } from 'react';
import type { OfficeSnapshot } from '@agents-office-app/domain';

export type ModalState =
  | Readonly<{ type: 'task'; agentId?: string | undefined }>
  | Readonly<{ type: 'agent'; agentId?: string | undefined }>
  | null;

/** Which form dialog is open. */
export function useModal(snapshot: OfficeSnapshot | null) {
  const [modal, setModal] = useState<ModalState>(null);
  const openTaskModal = useCallback(
    (agentId?: string) => {
      if (!snapshot) return;
      setModal({ type: 'task', agentId });
    },
    [snapshot],
  );
  const openAgentModal = useCallback(
    (agentId?: string) => setModal({ type: 'agent', agentId }),
    [],
  );
  const closeModal = useCallback(() => setModal(null), []);
  return { modal, openTaskModal, openAgentModal, closeModal };
}
