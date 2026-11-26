import type { Agent, Team } from '@agents-office-app/domain';
import { AVATAR_COLORS } from '../../lib/view/agent-form.ts';
import type { AgentForm } from '../../lib/view/agent-form.ts';
import { ColorSwatches } from '../atoms/ColorSwatches.tsx';
import { TextField } from '../atoms/TextField.tsx';
import { WorkspaceField } from '../atoms/WorkspaceField.tsx';
import { ProviderModelFields } from './ProviderModelFields.tsx';
import { RoleTeamFields } from './RoleTeamFields.tsx';

export function AgentFormFields({
  form,
  agent,
  teams,
  canBrowse,
  onPatch,
  onBrowse,
}: {
  form: AgentForm;
  agent: Agent | undefined;
  teams: readonly Team[];
  canBrowse: boolean;
  onPatch: (next: Partial<AgentForm>) => void;
  onBrowse: () => void;
}) {
  return (
    <>
      <TextField
        label="名前"
        data-autofocus
        value={form.displayName}
        maxLength={40}
        placeholder="例: 佐藤 みどり"
        onChange={(displayName) => onPatch({ displayName })}
      />
      <RoleTeamFields
        role={form.role}
        teamId={form.teamId}
        teams={teams}
        onRole={(role) => onPatch({ role })}
        onTeam={(teamId) => onPatch({ teamId })}
      />
      <ProviderModelFields
        provider={form.provider}
        model={form.model}
        effort={form.effort}
        onProvider={(provider) =>
          // A model name belongs to one provider.
          onPatch({ provider, model: agent?.provider === provider ? agent.model : '' })
        }
        onModel={(model) => onPatch({ model })}
        onEffort={(effort) => onPatch({ effort })}
      />
      <WorkspaceField
        value={form.workspacePath}
        placeholder={agent ? '空欄なら変更しません' : '空欄で既定のフォルダ'}
        canBrowse={canBrowse}
        onChange={(workspacePath) => onPatch({ workspacePath })}
        onBrowse={onBrowse}
      />
      <ColorSwatches
        legend="テーマカラー"
        colors={AVATAR_COLORS}
        value={form.avatarColor}
        onChange={(avatarColor) => onPatch({ avatarColor })}
      />
    </>
  );
}
