import type { OfficeHealth } from '@agents-office-app/domain';
import { formatSlotMeter } from '../../lib/view/summaries.ts';

const SLOTS = [0, 1, 2, 3];

/** Execution slots in use. Lives in the title bar, so every element stays draggable. */
export function SlotMeter({ health }: { health: OfficeHealth | null }) {
  return (
    <div
      className="slot-meter"
      data-tauri-drag-region
      title="同時に実行できる仕事は4件までです"
      aria-label={`実行枠 ${formatSlotMeter(health)}`}
    >
      <span className="slot-meter__dots" data-tauri-drag-region aria-hidden="true">
        {SLOTS.map((slot) => (
          <i key={slot} data-tauri-drag-region data-used={slot < (health?.slotsUsed ?? 0)} />
        ))}
      </span>
      <span data-tauri-drag-region>{formatSlotMeter(health)}</span>
    </div>
  );
}
