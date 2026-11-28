import { GripHorizontal, Maximize2, Tags } from 'lucide-react';
import type { LabelMode } from '@agents-office-app/office-scene';
import type { OfficeSnapshot } from '@agents-office-app/domain';
import type { ConnectionState } from '../../lib/api/store-state.ts';
import { CONNECTION_LABELS } from '../../lib/view/connection-labels.ts';
import { countByActivity, getPendingApprovals } from '../../lib/view/summaries.ts';
import type { OfficeActions } from '../actions.ts';
import { IconButton } from '../atoms/IconButton.tsx';
import { PinButton } from '../atoms/PinButton.tsx';
import { MiniApprovalButton } from '../molecules/MiniApprovalButton.tsx';

/** The mini window's floating bar and drag strip. */
export function MiniOfficeHud(props: {
  snapshot: OfficeSnapshot | null;
  connection: ConnectionState;
  labelMode: LabelMode;
  pinned: boolean;
  actions: OfficeActions;
  onLabelModeChange: (mode: LabelMode) => void;
  onTogglePin: () => void;
  onExpand: () => void;
}) {
  const { snapshot, connection, labelMode, pinned, actions, onExpand } = props;
  const counts = snapshot ? countByActivity(snapshot) : null;
  const approvals = snapshot ? getPendingApprovals(snapshot.approvals) : [];
  // Agents this office is running; external CLI sessions are not counted.
  const active = counts ? counts.working + counts.waiting : 0;
  const nextApproval = approvals[0];
  return (
    <>
      {/* The whole strip drags the window; only the pill's buttons take clicks. */}
      <div className="mini__dragstrip" data-tauri-drag-region />
      <div className="mini__bar" data-tauri-drag-region>
        <GripHorizontal size={14} className="mini__grip" data-tauri-drag-region />
        <span className="mini__count" data-tauri-drag-region data-connection={connection}>
          {connection === 'live' ? `稼働 ${active}` : CONNECTION_LABELS[connection]}
        </span>
        {nextApproval && (
          <MiniApprovalButton
            count={approvals.length}
            onClick={() => actions.select(nextApproval.agentId)}
          />
        )}
        <IconButton
          aria-pressed={labelMode === 'all'}
          aria-label="名札をすべて表示"
          title="名札をすべて表示"
          onClick={() => props.onLabelModeChange(labelMode === 'all' ? 'focus' : 'all')}
        >
          <Tags size={13} aria-hidden="true" />
        </IconButton>
        <PinButton pinned={pinned} iconSize={13} onToggle={props.onTogglePin} />
        <button type="button" className="mini__expand" title="拡大 (⌘⇧M)" onClick={onExpand}>
          <Maximize2 size={12} aria-hidden="true" />
          拡大
        </button>
      </div>
    </>
  );
}
