import type { Agent, AgentActivity, Team } from '@agents-office-app/domain';
import { AgentListItem } from './AgentListItem.tsx';

export function TeamSection({
  team,
  agents,
  activities,
  selectedId,
  onSelect,
}: {
  team: Team;
  agents: readonly Agent[];
  activities: Readonly<Record<string, AgentActivity>>;
  selectedId: string | null;
  onSelect: (agentId: string) => void;
}) {
  return (
    <section className="team">
      <h2 className="section-title">
        <span className="team__swatch" style={{ background: team.color }} />
        {team.name}
      </h2>
      {agents.length === 0 ? (
        <p className="empty">社員はいません</p>
      ) : (
        <ul className="list">
          {agents.map((agent) => (
            <AgentListItem
              key={agent.id}
              agent={agent}
              activity={activities[agent.id] ?? 'idle'}
              selected={selectedId === agent.id}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
