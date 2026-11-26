import type { OfficeLayout, SceneActivities } from '../types.ts';
import { FallbackTeam } from './FallbackTeam.tsx';

export type FallbackReason = 'unsupported' | 'failed' | 'layout';

const MESSAGES: Readonly<Record<FallbackReason, string>> = {
  unsupported: 'この環境では3D表示（WebGL2）を利用できないため、一覧で表示しています。',
  failed: '3D表示の読み込みに失敗しました。一覧から社員を選択できます。',
  layout: '3D配置を作成できませんでした。左の一覧から社員を選択してください。',
};

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
  reason: FallbackReason;
  onRetry?: (() => void) | undefined;
}) {
  return (
    <div className="ao-fallback" data-office-fallback={reason}>
      <p className="ao-fallback__message" role={reason === 'unsupported' ? 'status' : 'alert'}>
        {MESSAGES[reason]}
      </p>
      {onRetry && (
        <button type="button" className="ao-fallback__retry" onClick={onRetry}>
          3D表示を再試行
        </button>
      )}
      {layout.zones.map((zone) => (
        <FallbackTeam
          key={zone.teamId}
          zone={zone}
          members={layout.members.filter(({ member }) => member.teamId === zone.teamId)}
          activities={activities}
          selectedId={selectedId}
          onSelect={onSelect}
          compact={compact}
        />
      ))}
    </div>
  );
}
