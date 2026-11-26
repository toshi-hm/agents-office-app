import { ACTIVITY_LABELS } from '@agents-office-app/domain';
import { Nameplate } from '../Nameplate.tsx';
import type { SceneActivities, ScenePlacement, SceneZone } from '../types.ts';

export function FallbackTeam({
  zone,
  members,
  activities,
  selectedId,
  onSelect,
  compact,
}: {
  zone: SceneZone;
  members: readonly ScenePlacement[];
  activities: SceneActivities;
  selectedId: string | null;
  onSelect: (id: string) => void;
  compact: boolean;
}) {
  return (
    <section className="ao-fallback__team">
      <h3>
        <span className="ao-team-label__dot" style={{ background: zone.color }} />
        {zone.teamName}
      </h3>
      {members.length === 0 ? (
        <p>社員はまだいません。</p>
      ) : (
        <ul>
          {members.map(({ member }) => {
            const activity = activities[member.id] ?? 'idle';
            return (
              <li key={member.id} aria-label={`${member.displayName} ${ACTIVITY_LABELS[activity]}`}>
                <Nameplate
                  member={member}
                  activity={activity}
                  selected={member.id === selectedId}
                  compact={compact}
                  onSelect={onSelect}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
