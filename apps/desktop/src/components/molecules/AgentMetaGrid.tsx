import { PROVIDER_LABELS } from '@agents-office-app/domain';
import type { Agent } from '@agents-office-app/domain';
import { shortenPath } from '../../lib/view/format-utils.ts';
import { EFFORT_LABELS } from '../../lib/view/options.ts';

export function AgentMetaGrid({ agent }: { agent: Agent }) {
  return (
    <dl className="facts">
      <dt>プロバイダ</dt>
      <dd>{PROVIDER_LABELS[agent.provider]}</dd>
      <dt>モデル</dt>
      <dd>{agent.model || '既定'}</dd>
      <dt>思考の深さ</dt>
      <dd>{EFFORT_LABELS[agent.effort]}</dd>
      <dt>作業フォルダ</dt>
      <dd className="facts__path" title={agent.workspacePath}>
        {agent.workspacePath ? shortenPath(agent.workspacePath) : '未設定'}
      </dd>
    </dl>
  );
}
