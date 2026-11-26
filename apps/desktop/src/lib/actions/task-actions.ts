import type { OfficeActions } from '../../components/actions.ts';
import { deriveTaskTitle } from '../view/task-form.ts';
import type { ActionContext } from './context.ts';

export function createTaskActions({
  api,
  store,
  run,
  push,
}: ActionContext): Pick<OfficeActions, 'decide' | 'stopTask' | 'assign'> {
  return {
    decide: (approvalId, decision) =>
      void run(`approval:${approvalId}`, async () => {
        await api.decideApproval(approvalId, decision);
        await store.refresh();
      }),
    stopTask: (taskId) =>
      void run(`stop:${taskId}`, async () => {
        await api.stopTask(taskId);
        await store.refresh();
      }),
    assign: (agentId, prompt) =>
      run(`assign:${agentId}`, async () => {
        const text = prompt.trim();
        const title = deriveTaskTitle(text);
        // Only the request itself: every setting follows the agent on the server.
        await api.createTask({ title, prompt: text, agentId, kind: 'task' });
        push({ tone: 'success', title: '仕事を依頼しました', body: title, agentId });
        await store.refresh();
      }),
  };
}
