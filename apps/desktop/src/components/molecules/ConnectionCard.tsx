import type { ConnectionState } from '../../lib/api/store-state.ts';

/** Stands in for the office until the first snapshot arrives. */
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
