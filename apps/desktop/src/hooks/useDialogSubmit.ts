import type { Agent, CreateTaskInput } from '@agents-office-app/domain';
import type { ApiClient } from '../lib/api/http-client.ts';
import type { OfficeStore } from '../lib/api/office-store.ts';
import type { AgentForm } from '../lib/view/agent-form.ts';
import { buildCreateAgentInput, buildUpdateAgentInput } from '../lib/view/agent-input.ts';
import type { PushToast } from './useToasts.ts';

export type DialogSubmitContext = Readonly<{
  api: ApiClient;
  store: OfficeStore;
  push: PushToast;
  select: (agentId: string) => void;
  close: () => void;
}>;

/** Saves what a form dialog collected, then selects the agent it concerned. */
export function useDialogSubmit({ api, store, push, select, close }: DialogSubmitContext) {
  return {
    async submitTask(input: CreateTaskInput) {
      const task = await api.createTask(input);
      close();
      select(task.agentId);
      push({ tone: 'success', title: '仕事を依頼しました', body: task.title });
      await store.refresh();
    },
    async submitAgent(editing: Agent | undefined, form: AgentForm) {
      const saved = editing
        ? await api.updateAgent(editing.id, buildUpdateAgentInput(editing, form))
        : await api.createAgent(buildCreateAgentInput(form));
      await store.refresh();
      close();
      select(saved.id);
      push({
        tone: 'success',
        title: editing ? '社員の設定を保存しました' : '社員を追加しました',
        body: saved.displayName,
      });
    },
  };
}
