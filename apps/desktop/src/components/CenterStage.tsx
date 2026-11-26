import { OfficeViewport } from '@agents-office-app/office-scene';
import type { OfficeSnapshot } from '@agents-office-app/domain';
import type { ConnectionState } from '../lib/api-client.ts';
import type { ResolvedTheme } from '../lib/theme.ts';
import { countByActivity, getPendingApprovals } from '../lib/view-helpers.ts';

export const CONNECTION_LABELS: Readonly<Record<ConnectionState, string>> = {
  connecting: '接続中…',
  live: 'ライブ',
  reconnecting: '再接続中…',
  offline: 'オフライン',
};

export function ConnectionCard({
  error,
  connection,
  onRetry,
}: {
  error: string | null;
  connection: ConnectionState;
  onRetry: () => void;
}) {
  return (
    <div className="connection-card" role="status">
      <span className="connection-card__spinner" aria-hidden="true" />
      <p>
        {connection === 'offline'
          ? 'バックエンドに接続できません'
          : 'オフィスの準備をしています…'}
      </p>
      {error && <p className="connection-card__error">{error}</p>}
      {error && (
        <button type="button" className="button" onClick={onRetry}>
          今すぐ再接続
        </button>
      )}
    </div>
  );
}

export function CenterStage({
  snapshot,
  connection,
  error,
  selectedId,
  theme,
  onSelect,
  onRetry,
}: {
  snapshot: OfficeSnapshot | null;
  connection: ConnectionState;
  error: string | null;
  selectedId: string | null;
  theme: ResolvedTheme;
  onSelect: (id: string | null) => void;
  onRetry: () => void;
}) {
  const counts = snapshot ? countByActivity(snapshot) : null;
  const approvals = snapshot ? getPendingApprovals(snapshot.approvals).length : 0;
  return (
    <main className="stage">
      {snapshot ? (
        <OfficeViewport
          members={snapshot.agents}
          teams={snapshot.teams}
          activities={snapshot.agentActivities}
          selectedId={selectedId}
          onSelect={onSelect}
          theme={theme}
        />
      ) : (
        <ConnectionCard connection={connection} error={error} onRetry={onRetry} />
      )}
      <div className="status-bar" role="status">
        <span className="status-bar__connection" data-connection={connection}>
          {CONNECTION_LABELS[connection]}
        </span>
        {counts && snapshot && (
          <>
            <span>作業中 {counts.working}</span>
            <span>順番待ち {snapshot.health.queuedTasks}</span>
            {approvals > 0 && <span data-tone="warning">承認待ち {approvals}</span>}
            {counts.error > 0 && <span data-tone="error">エラー {counts.error}</span>}
            {snapshot.health.externalSessionsCount > 0 && (
              <span>外部CLI {snapshot.health.externalSessionsCount}</span>
            )}
          </>
        )}
        {connection !== 'live' && snapshot && (
          <button type="button" className="link" onClick={onRetry}>
            再接続
          </button>
        )}
      </div>
    </main>
  );
}
