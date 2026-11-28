import { useState } from 'react';
import type { FormEvent } from 'react';
import { Send } from 'lucide-react';
import type { Agent } from '@agents-office-app/domain';
import { isSubmitKey } from '../../lib/shortcuts.ts';
import type { OfficeActions } from '../actions.ts';

/** One text box that hands the agent a task with its default settings. */
export function QuickTaskForm({ agent, actions }: { agent: Agent; actions: OfficeActions }) {
  const [prompt, setPrompt] = useState('');
  const busy = actions.isBusy(`assign:${agent.id}`);
  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!prompt.trim() || busy) return;
    if (await actions.assign(agent.id, prompt)) setPrompt('');
  };
  return (
    <form className="card quick-assign" onSubmit={(event) => void submit(event)}>
      <h3 className="section-title">かんたん依頼</h3>
      <textarea
        value={prompt}
        rows={3}
        placeholder={`${agent.displayName}にお願いしたいこと…`}
        aria-label={`${agent.displayName}への依頼内容`}
        onChange={(event) => setPrompt(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (!isSubmitKey(event.nativeEvent)) return;
          event.preventDefault();
          void submit();
        }}
      />
      <div className="button-row button-row--between">
        <button type="button" className="link" onClick={() => actions.openTaskModal(agent.id)}>
          詳しく指定する
        </button>
        <button type="submit" className="button button--primary" disabled={!prompt.trim() || busy}>
          <Send size={13} aria-hidden="true" />
          依頼する
          <kbd>⌘↵</kbd>
        </button>
      </div>
    </form>
  );
}
