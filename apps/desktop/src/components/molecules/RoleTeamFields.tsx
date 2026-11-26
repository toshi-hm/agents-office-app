import { ROLE_LABELS } from '@agents-office-app/domain';
import type { AgentRole, Team } from '@agents-office-app/domain';
import { ROLES } from '../../lib/view/options.ts';
import { SelectField } from '../atoms/SelectField.tsx';

export function RoleTeamFields({
  role,
  teamId,
  teams,
  onRole,
  onTeam,
}: {
  role: AgentRole;
  teamId: string;
  teams: readonly Team[];
  onRole: (role: AgentRole) => void;
  onTeam: (teamId: string) => void;
}) {
  return (
    <div className="field-grid field-grid--two">
      <SelectField label="役職" value={role} onChange={(value) => onRole(value as AgentRole)}>
        {ROLES.map((value) => (
          <option key={value} value={value}>
            {ROLE_LABELS[value]}
          </option>
        ))}
      </SelectField>
      <SelectField label="チーム" value={teamId} onChange={onTeam}>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </SelectField>
    </div>
  );
}
