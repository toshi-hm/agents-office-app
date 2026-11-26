import { ACTIVITY_LABELS } from '@agents-office-app/domain';
import { Nameplate } from './Nameplate.tsx';
import type { OfficeLayout, SceneActivities } from './types.ts';

/** The same roster stays visible and selectable when 3D cannot be drawn. */
export function OfficeFallback({
  layout,
  activities,
  selectedId,
  onSelect,
  compact,
  reason,
  onRetry,
}: {
  layout: OfficeLayout;
  activities: SceneActivities;
  selectedId: string | null;
  onSelect: (id: string) => void;
  compact: boolean;
  reason: 'unsupported' | 'failed' | 'layout';
  onRetry?: (() => void) | undefined;
}) {
  const message =
    reason === 'unsupported'
      ? 'この環境では3D表示（WebGL2）を利用できないため、一覧で表示しています。'
      : reason === 'failed'
        ? '3D表示の読み込みに失敗しました。一覧から社員を選択できます。'
        : '3D配置を作成できませんでした。左の一覧から社員を選択してください。';
  return (
    <div className="ao-fallback" data-office-fallback={reason}>
      <p className="ao-fallback__message" role={reason === 'unsupported' ? 'status' : 'alert'}>
        {message}
      </p>
      {onRetry && (
        <button type="button" className="ao-fallback__retry" onClick={onRetry}>
          3D表示を再試行
        </button>
      )}
      {layout.zones.map((zone) => {
        const members = layout.members.filter(({ member }) => member.teamId === zone.teamId);
        return (
          <section key={zone.teamId} className="ao-fallback__team">
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
      })}
    </div>
  );
}
