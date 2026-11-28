import { useMemo } from 'react';
import type { OfficeActions } from '../components/actions.ts';
import type { ActionContext } from '../lib/actions/context.ts';
import { createOfficeAdminActions } from '../lib/actions/office-admin-actions.ts';
import { createTaskActions } from '../lib/actions/task-actions.ts';
import { createWorkspaceActions } from '../lib/actions/workspace-actions.ts';

/** Every user intent of both layouts, rebuilt whenever the busy set changes. */
export function useOfficeActions({
  busy,
  openTaskModal,
  openAgentModal,
  ...context
}: ActionContext & {
  busy: ReadonlySet<string>;
  openTaskModal: OfficeActions['openTaskModal'];
  openAgentModal: OfficeActions['openAgentModal'];
}): OfficeActions {
  const { api, store, bridge, run, push, select } = context;
  return useMemo<OfficeActions>(() => {
    const shared = { api, store, bridge, run, push, select };
    return {
      select,
      ...createTaskActions(shared),
      ...createOfficeAdminActions(shared),
      ...createWorkspaceActions(shared),
      openTaskModal,
      openAgentModal,
      isBusy: (key) => busy.has(key),
    };
  }, [api, store, bridge, run, push, select, busy, openTaskModal, openAgentModal]);
}
