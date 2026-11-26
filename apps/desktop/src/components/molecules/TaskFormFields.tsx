import type { Agent } from '@agents-office-app/domain';
import { TITLE_LIMIT, changeTaskProvider, deriveTaskTitle } from '../../lib/view/task-form.ts';
import type { TaskForm } from '../../lib/view/task-form.ts';
import { TextAreaField } from '../atoms/TextAreaField.tsx';
import { TextField } from '../atoms/TextField.tsx';
import { WorkspaceField } from '../atoms/WorkspaceField.tsx';
import { ProviderModelFields } from './ProviderModelFields.tsx';

/** What to do and how to run it. Updates are functional so no keystroke is lost. */
export function TaskFormFields({
  form,
  agent,
  canBrowse,
  onUpdate,
  onBrowse,
}: {
  form: TaskForm;
  agent: Agent | undefined;
  canBrowse: boolean;
  onUpdate: (update: (current: TaskForm) => TaskForm) => void;
  onBrowse: () => void;
}) {
  const patch = (next: Partial<TaskForm>) => onUpdate((current) => ({ ...current, ...next }));
  return (
    <>
      <TextAreaField
        label="依頼内容"
        data-autofocus
        rows={5}
        value={form.prompt}
        placeholder="例: READMEを読んで、改善点を3つ提案してください。"
        onChange={(prompt) => patch({ prompt })}
      />
      <TextField
        label="件名（省略可）"
        value={form.title}
        maxLength={TITLE_LIMIT * 3}
        placeholder={deriveTaskTitle(form.prompt) || '依頼内容の1行目を使います'}
        onChange={(title) => patch({ title })}
      />
      <ProviderModelFields
        provider={form.provider}
        model={form.model}
        effort={form.effort}
        onProvider={(provider) =>
          onUpdate((current) => changeTaskProvider(current, provider, agent))
        }
        onModel={(model) => patch({ model })}
        onEffort={(effort) => patch({ effort })}
      />
      <WorkspaceField
        value={form.workspacePath}
        placeholder="空欄で社員の作業フォルダ"
        canBrowse={canBrowse}
        onChange={(workspacePath) => patch({ workspacePath })}
        onBrowse={onBrowse}
      />
    </>
  );
}
