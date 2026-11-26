import type { OfficeActions } from '../../components/actions.ts';
import type { ActionContext } from './context.ts';

/** Removing staff and driving the demo scenario. */
export function createOfficeAdminActions({
  api,
  store,
  run,
  push,
  select,
}: ActionContext): Pick<OfficeActions, 'deleteAgent' | 'runDemo'> {
  return {
    deleteAgent: (agentId) =>
      void run(`delete:${agentId}`, async () => {
        await api.deleteAgent(agentId);
        select(null);
        push({ tone: 'success', title: '社員を削除しました' });
        await store.refresh();
      }),
    runDemo: (kind) =>
      void run('demo', async () => {
        const { startedTaskIds } = await api.runDemo(kind);
        push(
          kind === 'stop_all'
            ? { tone: 'success', title: 'すべての仕事に停止を指示しました' }
            : { tone: 'success', title: `デモの仕事を${startedTaskIds.length}件依頼しました` },
        );
        await store.refresh();
      }),
  };
}
