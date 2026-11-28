import { ACTIVITY_LABELS, PROVIDER_LABELS, ROLE_LABELS } from '@agents-office-app/domain';
import type { AgentActivity } from '@agents-office-app/domain';
import { PROVIDER_COLORS } from './provider-colors.ts';
import type { SceneMember } from './types.ts';

export type NameplateProps = Readonly<{
  member: SceneMember;
  activity: AgentActivity;
  selected: boolean;
  compact: boolean;
  onSelect: (id: string) => void;
}>;

/** Compact pill: provider dot, role, name and live status. Also usable outside the 3D canvas. */
export function Nameplate({ member, activity, selected, compact, onSelect }: NameplateProps) {
  const provider = PROVIDER_LABELS[member.provider];
  return (
    <button
      type="button"
      className="ao-nameplate"
      data-scene-label="member"
      data-member-id={member.id}
      data-role={member.role}
      data-activity={activity}
      data-selected={selected}
      data-compact={compact}
      aria-pressed={selected}
      title={`${ROLE_LABELS[member.role]} ${member.displayName}（${provider}）: ${ACTIVITY_LABELS[activity]}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(member.id);
      }}
    >
      <span className="ao-nameplate__identity">
        <span
          className="ao-nameplate__provider"
          style={{ background: PROVIDER_COLORS[member.provider] }}
          role="img"
          aria-label={provider}
        />
        <span className="ao-nameplate__role">{ROLE_LABELS[member.role]}</span>
        <span className="ao-nameplate__name">{member.displayName}</span>
      </span>
      <span className="ao-nameplate__status" data-activity={activity}>
        {ACTIVITY_LABELS[activity]}
      </span>
    </button>
  );
}
