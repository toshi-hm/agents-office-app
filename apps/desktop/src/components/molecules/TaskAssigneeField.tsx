import { ROLE_LABELS } from '@agents-office-app/domain';
import type { Agent, Team } from '@agents-office-app/domain';
import { groupAgentsByTeam } from '../../lib/view/group-agents.ts';
import { SelectField } from '../atoms/SelectField.tsx';

export function TaskAssigneeField({
  teams,
  agents,
  value,
  onChange,
}: {
  teams: readonly Team[];
  agents: readonly Agent[];
  value: string;
  onChange: (agentId: string) => void;
}) {
  return (
    <SelectField label="担当する社員" value={value} onChange={onChange}>
      {groupAgentsByTeam(teams, agents)
        .filter((group) => group.agents.length > 0)
        .map(({ team, agents: members }) => (
          <optgroup key={team.id} label={team.name}>
            {members.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName}（{ROLE_LABELS[item.role]}）
              </option>
            ))}
          </optgroup>
        ))}
    </SelectField>
  );
}
