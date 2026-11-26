import { useState } from 'react';
import { OfficeViewport } from '@agents-office-app/office-scene';
import type { LabelMode } from '@agents-office-app/office-scene';
import type { OfficeSnapshot } from '@agents-office-app/domain';
import type { ConnectionState } from '../../lib/api/store-state.ts';
import type { ResolvedTheme } from '../../lib/theme.ts';
import type { OfficeActions } from '../actions.ts';
import { ConnectionCard } from '../molecules/ConnectionCard.tsx';
import { MiniAgentPopover } from '../molecules/MiniAgentPopover.tsx';
import { MiniOfficeHud } from '../organisms/MiniOfficeHud.tsx';

/** The full-bleed diorama with a floating bar and a popover for the selected agent. */
export function MiniOfficeLayout(props: {
  snapshot: OfficeSnapshot | null;
  connection: ConnectionState;
  error: string | null;
  selectedId: string | null;
  theme: ResolvedTheme;
  /** Native windows keep the traffic lights, so the bar starts to their right. */
  native: boolean;
  pinned: boolean;
  actions: OfficeActions;
  onTogglePin: () => void;
  onExpand: () => void;
  onRetry: () => void;
}) {
  const { snapshot, connection, selectedId, actions, onExpand } = props;
  const [labelMode, setLabelMode] = useState<LabelMode>('focus');
  const selected = snapshot?.agents.find((agent) => agent.id === selectedId) ?? null;

  return (
    <div className="mini" data-native={props.native}>
      <div className="mini__stage">
        {snapshot ? (
          <OfficeViewport
            compact
            members={snapshot.agents}
            teams={snapshot.teams}
            activities={snapshot.agentActivities}
            selectedId={selectedId}
            onSelect={actions.select}
            theme={props.theme}
            labelMode={labelMode}
          />
        ) : (
          <ConnectionCard connection={connection} error={props.error} onRetry={props.onRetry} />
        )}
      </div>
      <MiniOfficeHud
        snapshot={snapshot}
        connection={connection}
        labelMode={labelMode}
        pinned={props.pinned}
        actions={actions}
        onLabelModeChange={setLabelMode}
        onTogglePin={props.onTogglePin}
        onExpand={onExpand}
      />
      {snapshot && selected && (
        <MiniAgentPopover
          snapshot={snapshot}
          agent={selected}
          actions={actions}
          onExpand={onExpand}
        />
      )}
    </div>
  );
}
