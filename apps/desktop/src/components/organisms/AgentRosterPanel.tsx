import type { OfficeSnapshot } from '@agents-office-app/domain';
import { groupAgentsByTeam } from '../../lib/view/group-agents.ts';
import type { OfficeActions } from '../actions.ts';
import { TeamSection } from '../molecules/TeamSection.tsx';

export function AgentRosterPanel({
  snapshot,
  selectedId,
  actions,
}: {
  snapshot: OfficeSnapshot;
  selectedId: string | null;
  actions: OfficeActions;
}) {
  const groups = groupAgentsByTeam(snapshot.teams, snapshot.agents);
  return (
    <>
      {groups.map(({ team, agents }) => (
        <TeamSection
          key={team.id}
          team={team}
          agents={agents}
          activities={snapshot.agentActivities}
          selectedId={selectedId}
          onSelect={actions.select}
        />
      ))}
    </>
  );
}
