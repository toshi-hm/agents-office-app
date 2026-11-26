import { OfficeViewport } from '@agents-office-app/office-scene';
import type { OfficeSnapshot } from '@agents-office-app/domain';
import type { ConnectionState } from '../../lib/api/store-state.ts';
import type { ResolvedTheme } from '../../lib/theme.ts';
import { ConnectionCard } from '../molecules/ConnectionCard.tsx';
import { StatusBar } from '../molecules/StatusBar.tsx';

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
      <StatusBar snapshot={snapshot} connection={connection} onRetry={onRetry} />
    </main>
  );
}
